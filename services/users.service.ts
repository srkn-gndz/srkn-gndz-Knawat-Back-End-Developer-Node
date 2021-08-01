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
			index: 'users'
		})


		this.parseServiceSchema(Service.mergeSchemas({
			name: "users",
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
					"name",
					"password",
				],

				// Validator for the `create` & `insert` actions.
				entityValidator: {
					name: "string|min:2",
					password: "string|min:2",
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

				 register: {
					rest: "POST /register",
					params: {
						name: "string",
						password: "string",
					},
					async handler(ctx: Context<{index: string, type: string, id: string, name: string; password: string, body: { name: string; password: string }}>) {
						this.client.index({
							index: 'users',
							type: 'users',
							body: {name: ctx.params.name, password: ctx.params.password }
						}, async (err: any, resp: any, status: any) => {

						});

						this.client.indices.refresh({
							index: 'users',
							ignore_unavailable: true,
							allow_no_indices: false,
							expand_wildcards: 'all'
						})
						return {result: 'user successfully logged in' };
					},
				},

				login: {
					rest: "POST /login/",
					params: {
						name: "string",
						password: "string"
					},
					async handler(ctx: Context<{index: string, type: string, id: string, name: string; password: string, body: { name: string; password: string }}>) {
						const result = await this.client.search({
							index: 'users',
							body: {
								"query": {
									"bool": {
									  "must": [
										{
										  "match": {
											"name": ctx.params.name
										  }
										},
										{
										  "match": {
											"password": ctx.params.password
										  }
										}
									  ]
									}
								}
							}
						})
						
						if(result?.hits.hits.length > 0) {
							return {result: 'user successfully logged in' }
						} else {
							return {result: 'user not found' }
						}
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
