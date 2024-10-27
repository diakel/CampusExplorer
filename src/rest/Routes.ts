import express, {Application, query, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";
import * as repl from "repl";

export function echo(req: Request, res: Response) {
	try {
		console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
		const response = performEcho(req.params.msg);
		res.status(200).json({result: response});
	} catch (err) {
		res.status(400).json({error: err});
	}
}

export function performEcho(msg: string): string {
	if (typeof msg !== "undefined" && msg !== null) {
		return `${msg}...${msg}`;
	} else {
		return "Message not provided";
	}
}

export async function putDataset(req: Request, res: Response) {
	try {
		let facade: InsightFacade = res.app.locals.facade;
		const response = await facade.addDataset(req.params.id, req.body, req.params.kind as InsightDatasetKind);
		res.status(200).json({result: response});
	} catch (err) {
		let response = "error";
		res.status(400).json({error: response});
	}
}

export async function deleteDataset(req: Request, res: Response) {
	try {
		let facade: InsightFacade = res.app.locals.facade;
		const response = await facade.removeDataset(req.params.id);
		res.status(200).json({result: response});
	} catch (err: any) {
		let response = "error";
		if (err instanceof InsightError) {
			res.status(400).json({error: response});
		} else if (err instanceof NotFoundError) {
			res.status(404).json({error: response});
		}

	}
}

export async function postQuery(req: Request, res: Response) {
	try {
		let facade: InsightFacade = res.app.locals.facade;
		const response = await facade.performQuery(req.body);
		res.status(200).json({result: response});
	} catch (err) {
		let response = "error";
		res.status(400).json({error: response});
	}
}

export async function getDataset(req: Request, res: Response) {
	try {
		let facade: InsightFacade = res.app.locals.facade;
		const response = await facade.listDatasets();
		res.status(200).json({result: response});
	} catch (err) {
		let response = "error";
		res.status(400).json({error: response});
	}
}
