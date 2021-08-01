"use strict";
import {Context, Service, ServiceBroker, ServiceSchema} from "moleculer";

// import DbConnection from "../mixins/db.mixin";
import ESService from "moleculer-elasticsearch";

import elasticsearch from "@elastic/elasticsearch";
import { listenerCount } from "events";
import { Bulk } from "@elastic/elasticsearch/api/requestParams";



export default class CartService extends Service{

	private client = new elasticsearch.Client({ node: 'http://elastic:changeme@elasticsearch:9200' })

	// @ts-ignore
	public async constructor(public broker: ServiceBroker, schema: ServiceSchema<{}> = {}) {
		super(broker);

		this.client.ping({
		}, (error: any) =>  {
			if (error) {
				console.error('elasticsearch cluster is down!');
			} else {
				console.log('Everything is ok');
			}
		});

		this.client.indices.create({
			index: 'cart'
		})


		this.parseServiceSchema(Service.mergeSchemas({
			name: "cart",
			mixins: [ESService],
			settings: {
				elasticsearch: {
					host: "http://elastic:changeme@elasticsearch:9200",
					apiVersion: "5.6",
					httpAuth: 'elastic:changeme'
				},
				// Available fields in the responses
				fields: [
					"_id",
					"product_id",
                    "piece"
				],

				// Validator for the `create` & `insert` actions.
				entityValidator: {
                    piece: "number|positive",
				},
			},
			hooks: {
				before: {
					/**
					 * Register a before hook for the `create` action.
					 * It sets a default value for the quantity field.
					 *
					 * @param {Context} ctx
					 */
					// create: (ctx: Context<{ piece: number }>) => {
					// 	ctx.params.piece = 1;
					// },
				},
			},
			actions: {
				/**
				 * The "moleculer-db" mixin registers the following actions:
				 *  - list
				 *  - find
				 *  - count
				 *  - create
				 *  - insert
				 *  - update
				 *  - remove
				 */

				// --- ADDITIONAL ACTIONS ---

				/**
				 * Increase the quantity of the product item.
				 */

				list: {
					rest: "GET /",
					params: {},
					async handler() {
						this.client.indices.refresh({
							index: 'cart'
						})
						
						const result = await this.client.search({
							index: 'cart',
							q: '*:*',
							size: 1000,
						})

						if(result) {
							return {
								rows: result.hits.hits,
								total: result.hits.total
							}
						} else {
							return {
								rows: [],
								total: 0
							}
						}
					},
				},

				 add: {
					rest: "POST /add/",
					params: {
						product_id: "string",
						// @ts-ignore
						piece: "number|integer|positive",
					},
					async handler(ctx: Context<{index: string, type: string, piece: number, product_id: string, body: { piece: number, product_id: string }}>) {

						this.client.index({
							index: 'cart',
							type: 'cart',
							body: { piece: ctx.params.piece, product_id: ctx.params.product_id }
						}, async (err: any, resp: any, status: any) => {
							// console.log(resp);
							const json = await this.transformDocuments(ctx, ctx.params, resp);
							return json;
						});

						this.client.indices.refresh({
							index: 'products',
							ignore_unavailable: true,
							allow_no_indices: false,
							expand_wildcards: 'all'
						})

						return {piece: ctx.params.piece, product_id: ctx.params.product_id };
					},
				},

                delete: {
					rest: "DELETE /delete/:id",
					params: {
						id: "string",
					},
					async handler(ctx: Context<{index: string, type: string, id: string, body: { id: string }}>) {

						this.client.delete({
							index: 'cart',
							type: 'cart',
							id: ctx.params.body.id
						});

                        return {result: 'cart updated successfully' };
					},
				},

				increaseQuantity: {
					rest: "PUT /:id/quantity/increase",
					params: {
						id: "string",
						// @ts-ignore
						value: "number|integer|positive",
					},
					async handler(ctx: Context<{ id: string; value: number }>) {
						const doc = await this.adapter.updateById(ctx.params.id, { $inc: { quantity: ctx.params.value } });
						const json = await this.transformDocuments(ctx, ctx.params, doc);
						await this.entityChanged("updated", json, ctx);

						return json;
					},
				},

				/**
				 * Decrease the quantity of the product item.
				 */
				decreaseQuantity: {
					rest: "PUT /:id/quantity/decrease",
					params: {
						id: "string",
						// @ts-ignore
						value: "number|integer|positive",
					},
					/** @param {Context} ctx  */
					async handler(ctx: Context<{ id: string; value: number }>) {
						const doc = await this.adapter.updateById(ctx.params.id, { $inc: { quantity: -ctx.params.value } });
						const json = await this.transformDocuments(ctx, ctx.params, doc);
						await this.entityChanged("updated", json, ctx);
						return json;
					},
				},
			},
			methods: {
				/**
				 * Loading sample data to the collection.
				 * It is called in the DB.mixin after the database
				 * connection establishing & the collection is empty.
				 */
				async seedDB() {
					await this.adapter.insertMany([
						{ name: "Samsung Galaxy S10 Plus", quantity: 10, price: 704 },
						{ name: "iPhone 11 Pro", quantity: 25, price: 999 },
						{ name: "Huawei P30 Pro", quantity: 15, price: 679 },
					]);
				},
			},
			/**
			 * Loading sample data to the collection.
			async afterConnected() {
			 await this.adapter.collection.createIndex({ name: 1 });
			},
			 */
		}, schema));
	}

	// list(): Promise<any> {

    // }
}
