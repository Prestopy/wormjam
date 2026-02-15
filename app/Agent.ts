import {Vec2} from "@/app/Vec2";
import {clamp, getC, getR, inRad} from "@/app/utils";
import {PheromoneMap} from "@/app/Manager";

export class Agent {
	private pos: Vec2;

	private theta: number;

	public static SPEED = 1;

	public static ROTATE_BY = 8;
	public static MAX_NOISE = 30;

	public static PHEROMONE_DEPOSIT = 0.5;

	public static SENSOR_OFFSET = 15; // how far away from the agent
	public static SENSOR_ANGLE_OFFSET = 30; // how much to rotate the sensor from the forward direction

	constructor(pos: Vec2) {
		this.pos = pos;
		this.theta = Math.random() * 360;
	}

	public getPos() {
		return this.pos;
	}

	public static getSpeed() {
		return Agent.SPEED;
	}
	public static getRotateBy() {
		return Agent.ROTATE_BY;
	}
	public static getMaxNoise() {
		return Agent.MAX_NOISE;
	}
	public static getSensorOffset() {
		return Agent.SENSOR_OFFSET;
	}
	public static getSensorAngleOffset() {
		return Agent.SENSOR_ANGLE_OFFSET;
	}
	public static getPheromoneDeposit() {
		return Agent.PHEROMONE_DEPOSIT;
	}

	public static setSpeed(speed: number) {
		Agent.SPEED = clamp(speed, 0.5, 15);
	}
	public static setRotateBy(rotateBy: number) {
		Agent.ROTATE_BY = clamp(rotateBy, 0, 179);
	}
	public static setMaxNoise(maxNoise: number) {
		Agent.MAX_NOISE = clamp(maxNoise, 0, 360);
	}
	public static setSensorOffset(sensorOffset: number) {
		Agent.SENSOR_OFFSET = clamp(sensorOffset, 0, 100);
	}
	public static setSensorAngleOffset(sensorAngleOffset: number) {
		Agent.SENSOR_ANGLE_OFFSET = clamp(sensorAngleOffset, 0, 179);
	}
	public static setPheromoneDeposit(pheromoneDeposit: number) {
		Agent.PHEROMONE_DEPOSIT = clamp(pheromoneDeposit, 0, 1);
	}

	public update(pheromoneMap: PheromoneMap) {
		if (pheromoneMap.map === null) throw new Error("Pheromone map must be initialized before updating agents");

		this.sense(pheromoneMap);
		this.pos.x += Math.cos(inRad(this.theta)) * Agent.SPEED;
		this.pos.y += Math.sin(inRad(this.theta)) * Agent.SPEED;

		const w = pheromoneMap.width;
		const h = pheromoneMap.height;
		const r = getR(Math.floor(this.pos.y), h);
		const c = getC(Math.floor(this.pos.x), w);

		pheromoneMap.map[r * pheromoneMap.width + c] = Agent.PHEROMONE_DEPOSIT;
	}

	private sense(pheromoneMap: PheromoneMap) {
		this.theta += Math.random() * Agent.MAX_NOISE*2 - Agent.MAX_NOISE; // from -MAX to +MAX

		const v1 = this.getSensorValue(pheromoneMap, -Agent.SENSOR_ANGLE_OFFSET);
		const v2 = this.getSensorValue(pheromoneMap, 0);
		const v3 = this.getSensorValue(pheromoneMap, +Agent.SENSOR_ANGLE_OFFSET);

		if (v1 > v2 && v1 > v3) {
			this.theta -= Agent.ROTATE_BY;
		} else if (v3 > v2 && v3 > v1) {
			this.theta += Agent.ROTATE_BY;
		}
	}

	private getSensorValue(pheromoneMap: PheromoneMap, angleOffset: number): number {
		if (pheromoneMap.map === null) throw new Error("Pheromone map must be initialized before sensing");

		const w = pheromoneMap.width
		const h = pheromoneMap.height;

		const dir = new Vec2(Math.cos(inRad(this.theta + angleOffset)), Math.sin(inRad(this.theta + angleOffset)));
		const pos = this.pos.add(dir.mul(Agent.SENSOR_OFFSET));

		const r = getR(Math.floor(pos.y), h);
		const c = getC(Math.floor(pos.x), w);

		return pheromoneMap.map[r*w + c];
	}
}
