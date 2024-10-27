import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import {listDatasets} from "./DatasetProcessorHelpers";
import QueryHandler from "./QueryHandler";
import Section from "./Section";
import * as fs from "fs-extra";
import DatasetProcessor from "./DatasetProcessor";
import Room from "./Room";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let data: Section[] | Room[];
let datasets: InsightDataset[] = [];

export default class InsightFacade implements IInsightFacade {
	private queryHandler: QueryHandler;
	private datasetProcessor: DatasetProcessor;
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.queryHandler = new QueryHandler();
		this.datasetProcessor = new DatasetProcessor();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		data = await this.datasetProcessor.processData(id, content, kind);
		datasets = await this.listDatasets();
		const promises: Array<Promise<void>> = [];
		datasets.push({id: id, kind: kind, numRows: data.length});
			// await new Promise((resolve) => setTimeout(resolve, 1000));
		const promise = new Promise<void>((resolve, reject) => {
			fs.writeFile("./data/datasetsMeta.json", JSON.stringify(datasets, null, 2), (err_5: any) => {
				if (err_5) {
					reject(err_5);
				}
				resolve();
					// resolve(datasets.map((dataset) => dataset.id));
			});
		});
		promises.push(promise);
		await Promise.all(promises);
		return datasets.map((dataset) => dataset.id);
	}

	// sources: node.js fs.unlink documentation
	public async removeDataset(id: string): Promise<string> {
		datasets = await this.listDatasets();
		return new Promise((resolve, reject) => {
			// validating id
			if (!/^[^_]+$/.test(id) || !id.replace(/\s/g, "").length) {
				reject(new InsightError("Invalid dataset id"));
			} else if (!datasets.map((dataset) => dataset.id).includes(id)) {
				reject(new NotFoundError("Given ID has not been added"));
			}
			// clearing out the dataset array
			datasets = datasets.filter((dataset) => dataset.id !== id);
			// deleting the file from the disk
			fs.remove("./data/" + id + ".json", (err: any) => {
				if (err) {
					reject(err);
				}
				fs.writeFile("./data/datasetsMeta.json", JSON.stringify(datasets, null, 2), (err_5: any) => {
					if (err_5) {
						console.error(err_5);
					}
					resolve(id);
				});
			});
		});
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// create query tree from input
		// execute query recursively

		await this.queryHandler.Initialize(query);
		return this.queryHandler.Execute();
		// return Promise.reject("Not implemented.");
	}

	// reads datasets from datasets.json, returns emptiness if the directory doesn't exist
	public async listDatasets(): Promise<InsightDataset[]> {
		return await listDatasets();
	}
}
