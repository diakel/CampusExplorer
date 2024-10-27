import {InsightResult} from "./IInsightFacade";
import Section from "./Section";

// Builds an InsightResult from a given column of a section
export function BuildResult(column: any, result: InsightResult, section: Section) {
	let field: keyof Section = column.substring(column.indexOf("_") + 1) as keyof Section;
	// convert dataset names to file names
	if (field === "uuid" as keyof Section) {
		field = "id" as keyof Section;
	} else if (field === "instructor" as keyof Section) {
		field = "professor" as keyof Section;
	} else if (field === "id" as keyof Section) {
		field = "course" as keyof Section;
	} else if (field === "dept" as keyof Section) {
		field = "subject" as keyof Section;
	}
	result[column] = section[field];
	if (field === "id" as keyof Section) {
		result[column] = "" + section[field] as string + "";
	}
}

export function BuildSField(skey: string) {
	let sfield = skey.substring(skey.indexOf("_") + 1) as keyof Section;
	if (sfield === "uuid" as keyof Section) {
		sfield = "id" as keyof Section;
	} else if (sfield === "instructor" as keyof Section) {
		sfield = "professor" as keyof Section;
	} else if (sfield === "id" as keyof Section) {
		sfield = "course" as keyof Section;
	} else if (sfield === "dept" as keyof Section) {
		sfield = "subject" as keyof Section;
	}
	return sfield;
}
