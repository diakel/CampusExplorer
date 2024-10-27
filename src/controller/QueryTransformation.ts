import {InsightError, InsightResult} from "./IInsightFacade";
import Decimal from "decimal.js";

export default class QueryTransformation {
	// takes in filtered dataset and applies transformation as specified in query.
	public static applyTransformation(input: InsightResult[], map: any[][], query: any): InsightResult[] {
		try {
			let output: InsightResult[] = [];
			// let groups: InsightResult[][] = this.group(query, input);
			let groupCategories: string[] = Object.values(query["TRANSFORMATIONS"]["GROUP"]);
			let groups: any = groupBy(input, (item: any): any => {
				let result = [];
				for (let category of groupCategories) {
					result.push(item[category as keyof InsightResult]);
				}
				return result;
			});
			if (map.length === 0) {
				for (let group of groups) {
					output.push(group[0]);
				}
			} else {
				for (let group of groups) {
					this.ApplyOverGroup(map, group, output);
				}
				// groups = output;
			}
			return output;
		} catch (e) {
			throw new InsightError("Error in applying transformation");
		}
	}

	// Apply a given apply rule to a group and modify output
	private static ApplyOverGroup(map: any[][], group: any, output: InsightResult[]) {
		let outputrow: InsightResult = {};
		for (let apply of map) {
			let token = apply[2];
			let count: number = 0;
			let unique: Array<string | number> = [];
			let rows: number = 0;
			let sum: Decimal = new Decimal(0);
			let max: number = -1;
			let min: number = -1;
			group.forEach((item: any): any => {
				outputrow = item;
				let cur = item[apply[1]];
				if (typeof cur === "string") {
					if (token !== "COUNT") {
						throw new InsightError("Invalid Apply Rule");
					}
				} else if (token === "AVG") {
					rows = rows + 1;
					sum = Decimal.add(new Decimal(cur), sum);
				} else if (token === "MIN") {
					if (cur < min || min === -1) {
						min = cur;
					}
				} else if (token === "MAX") {
					if (cur > max) {
						max = cur;
					}
				} else if (token === "COUNT") {
					if (!unique.includes(cur)) {
						count = count + 1;
						unique.push(cur);
					}
				} else if (token === "SUM") {
					sum = Decimal.add(new Decimal(cur), sum);
				}
			});
			let avg = +(sum.toNumber() / rows).toFixed(2);
			if (outputrow) {
				// delete outputrow[apply[1]];
				this.CheckTokenAndOutput(token, outputrow, apply, avg, min, max, count, sum);

			}
		}
		for (let apply of map) {
			delete outputrow[apply[1]];
		}
		output.push(outputrow);
	}

	private static CheckTokenAndOutput(token: any, outputrow: InsightResult, apply: any[], avg: number, min: number,
		max: number, count: number, sum: Decimal) {
		if (token === "AVG") {
			outputrow[apply[0]] = avg;
		} else if (token === "MIN") {
			outputrow[apply[0]] = min;
		} else if (token === "MAX") {
			outputrow[apply[0]] = max;
		} else if (token === "COUNT") {
			outputrow[apply[0]] = count;
		} else if (token === "SUM") {
			outputrow[apply[0]] = +sum.toFixed(2);
		}
	}

	/*
			private static group(query: any, input: InsightResult[]): InsightResult[][] {
				let groupCategories: string[] = Object.values(query["TRANSFORMATIONS"]["GROUP"]);
				// 2d array consisting of arrays with values for a specific group and a mapping to the 1st index in groups
				let groupCategoriesMapping: Array<Array<string | number>> = [];
				// 2d array consisting of insight results sorted into different groups
				let groups: InsightResult[][] = [];
				// get group
				// for all in input, check against all in group and insert into array representing groupings.
				let i = 0;
				for (let entry of input) {
					let test = false;
					for (let mapEntry of groupCategoriesMapping) {
						test = true;
						for (let category of groupCategories) {
							let temp = category as keyof InsightResult;
							if ((mapEntry[groupCategories.indexOf(category)] !== null) &&
								(entry[temp] === mapEntry[groupCategories.indexOf(category)])) {
								test = test && true;
							} else {
								test = false;
							}
						}
						if (test) {
							let index: number = mapEntry[mapEntry.length - 1] as number;
							groups[index].push(entry);
							break;
						}
					}
					if (!test) {
						let mapEntry: Array<string | number> = [];
						for (let category of groupCategories) {
							let temp = category as keyof InsightResult;
							mapEntry.push(entry[temp]);
						}
						mapEntry.push(i);
						groupCategoriesMapping.push(mapEntry);
						let temp = [entry];
						groups.push(temp);
						i++;
					}
				}
				return groups;
			}
			*/
}
// https://codereview.stackexchange.com/questions/37028/grouping-elements-in-array-by-multiple-properties
// much more efficient group function
function groupBy( array: any , f: any ) {
	let groups: any = {};
	array.forEach( function( o: any ) {
		let group: any = JSON.stringify( f(o) );
		groups[group] = groups[group] || [];
		groups[group].push( o );
	});
	return Object.keys(groups).map( function( group ) {
		return groups[group];
	});
}
