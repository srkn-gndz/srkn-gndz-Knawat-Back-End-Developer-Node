"use strict";
import {Context, Service, ServiceBroker, ServiceSchema} from "moleculer";

// import DbConnection from "../mixins/db.mixin";
import ESService from "moleculer-elasticsearch";
import elasticsearch from "@elastic/elasticsearch";


export default class ProductsService extends Service{

	

	// private DbMixin = new DbConnection("products").start();
	// http://elastic:changeme@elasticsearch:9200
	public client = new elasticsearch.Client({ node: 'http://elastic:changeme@elasticsearch:9200' })
	// {hosts: ['http://elasticsearch:9200'], apiVersion: '5.6', httpAuth: 'elastic:changeme'}


	// @ts-ignore
	public async constructor(public broker: ServiceBroker, schema: ServiceSchema<{}> = {name: 'products'}) {
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
			index: 'products'
		})

		this.client.index({
			index: 'products',
			type: 'products',
			body: {name: 'Iphone 7', quantity: 100, price: 200}
		});

		this.client.index({
			index: 'products',
			type: 'products',
			body: { name: 'Iphone 8', quantity: 100, price: 300}
		});

		this.client.index({
			index: 'products',
			type: 'products',
			body: { name: 'Iphone X', quantity: 100, price: 400}
		});

		this.client.index({
			index: 'products',
			type: 'products',
			body: { name: 'Iphone 11', quantity: 100, price: 500}
		});

		this.client.index({
			index: 'products',
			type: 'products',
			body: { name: 'Iphone 12', quantity: 100, price: 600}
		});

		this.client.indices.refresh({
			index: 'products',
			ignore_unavailable: true,
			allow_no_indices: false,
			expand_wildcards: 'all'
		})


		this.parseServiceSchema(Service.mergeSchemas({
			name: "products",
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
					"quantity",
					"price",
				],

				// Validator for the `create` & `insert` actions.
				entityValidator: {
					name: "string|min:3",
					price: "number|positive",
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
					create: (ctx: Context<{ quantity: number }>) => {
						ctx.params.quantity = 0;
					},
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
				get: {
					rest: "GET /:id",
					params: {
						id: "string",
					},
					async handler(ctx: Context<{ id: string; }>) {
						const result = await this.client.search({
							index: 'products',
							body: {
								"query": {
									"match" : {
										"_id" : ctx.params.id
									}
								},
							}
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
					}
				},

				list: {
					rest: "GET /",
					params: {},
					async handler() {
						this.client.indices.refresh({
							index: 'products'
						})
						
						const result = await this.client.search({
							index: 'products',
							q: '*:*',
							size: 1000,
						})



						if(result?.hits.hits.length > 0) {
							return {
								rows: result.hits.hits,
								total: result.hits.total
							}
						} else {
							this.client.indices.create({
								index: 'products'
							})
					
					
							this.client.index({
								index: 'products',
								type: 'products',
								body: { name: 'Iphone 7', quantity: 100, price: 200}
							});
					
							this.client.index({
								index: 'products',
								type: 'products',
								body: { name: 'Iphone 8', quantity: 100, price: 300}
							});
					
							this.client.index({
								index: 'products',
								type: 'products',
								body: {name: 'Iphone X', quantity: 100, price: 400}
							});
					
							this.client.index({
								index: 'products',
								type: 'products',
								body: { name: 'Iphone 11', quantity: 100, price: 500}
							});
					
							this.client.index({
								index: 'products',
								type: 'products',
								body: { name: 'Iphone 12', quantity: 100, price: 600}
							});

							this.client.indices.refresh({
								index: 'products'
							})
							
							const result = await this.client.search({
								index: 'products',
								q: '*:*',
								size: 1000,
							})

							return {
								rows: result.hits.hits,
								total: result.hits.total
							}
						}

						// let promise = new Promise(async (resolve, reject) => {
			  			// });
			  			// return promise;
						// console.log('response result');
						// console.dir(result)
					},
				},

				 create: {
					rest: "POST /",
					params: {
						name: "string",
						// @ts-ignore
						price: "number|integer|positive",
					},
					async handler(ctx: Context<{index: string, type: string, id: string, name: string; price: number, body: { name: string; price: number }}>) {

						// return {hello: 'world', name: ctx.params.body.name, price: ctx.params.body.price};

						this.client.index({
							index: 'products',
							type: 'products',
							body: {name: ctx.params.name, price: ctx.params.price, quantity: 666 }
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

						// return  {name: ctx.params.name, price: ctx.params.price, quantity: 666 }
						// const doc = await this.broker.create({name: ctx.params.name, price: ctx.params.price, quantity: 555 });
						// const json = await this.transformDocuments(ctx, ctx.params, doc);
						// await this.entityChanged("updated", json, ctx);
						return {name: ctx.params.name, price: ctx.params.price, quantity: 555 };
					},
				},

				increaseQuantity: {

					async handler() {
						// return 'hello';
						// const doc = await this.adapter.updateById(ctx.params.id, { $inc: { quantity: ctx.params.value } });
						// const json = await this.transformDocuments(ctx, ctx.params, doc);
						// await this.entityChanged("updated", json, ctx);
						new Promise((resolve, reject) => {
							resolve({
								_id: "123",
								name: "Awesome thing",
								price: 999,
								quantity: 25,
							})
						  });
						  return {
							_id: "123",
							name: "Awesome thing",
							price: 999,
							quantity: 25,
						  }
						//   exit()
						// return {
						// 	_id: "123",
						// 	name: "Awesome thing",
						// 	price: 999,
						// 	quantity: 25,
						// };
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

	getProviderList() {
		// return this.broker.call('products.increaseQuantity')

		return {
			_id: "123",
			name: "Awesome thing",
			price: 999,
			quantity: 25,
		};
	}

	// list(): Promise<any> {

    // }
}


