"use client";
import {useEffect, useRef, useState} from "react";
import {Manager} from "@/app/Manager";
import {Agent} from "@/app/Agent";

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
	const [brushSettings, setBrushSettings] = useState<
		{
			type: "none" | "add" | "remove",
			brushSize: number,
		}
	>({
		type: "none",
		brushSize: 40,
	});
	const brushSettingsRef = useRef(brushSettings);
	useEffect(() => {
		brushSettingsRef.current = brushSettings;
	}, [brushSettings]);
	const cursorPosRef = useRef({ x: 0, y: 0 });
	const mouseDownRef = useRef(false);


	const [displaySettings, setDisplaySettings] = useState({
		displayPheromones: true
	});
	const displaySettingsRef = useRef(displaySettings);
	useEffect(() => {
		displaySettingsRef.current = displaySettings;
	}, [displaySettings]);


	const [settings, setSettings] = useState({
		numAgents: 160_000,
		decay: 0.98,

		speed: 2,
		rotateBy: 30,
		maxNoise: 10,
		sensorOffset: 20,
		sensorAngleOffset: 45,
		pheromoneDeposit: 0.5
	});
	const updateSettings = (key: keyof typeof settings, val: number, setter: (v: number) => void) => {
		setter(val);
		setSettings(prev => ({ ...prev, [key]: val }));
	};

	const manager = Manager.getInstance();
	useEffect(() => {
		// apply settings
		// manager.setSize(500, 500);
		manager.setSize(window.innerWidth, window.innerHeight);

		manager.populate(settings.numAgents);
		manager.setDecay(settings.decay);
		Agent.setSpeed(settings.speed);
		Agent.setRotateBy(settings.rotateBy);
		Agent.setMaxNoise(settings.maxNoise);
		Agent.setSensorOffset(settings.sensorOffset);
		Agent.setSensorAngleOffset(settings.sensorAngleOffset);
		Agent.setPheromoneDeposit(settings.pheromoneDeposit);

		// build
		manager.build();
		// manager.resize(window.innerWidth, window.innerHeight);

		const canvas = canvasRef.current;
		if (canvas) {
			canvas.width = manager.getW();
			canvas.height = manager.getH();
		}

		// window resize handler // FIXME: window resize is terrible- doesnt work
		function handleResize() {
			manager.resize(window.innerWidth, window.innerHeight);
			if (canvasRef.current) {
				canvasRef.current.width = manager.getW();
				canvasRef.current.height = manager.getH();
			}
		}
		window.addEventListener("resize", handleResize);

		// cursor position ref
		function handleCursorMove(e: MouseEvent) {
			cursorPosRef.current = {
				x: e.clientX,
				y: e.clientY
			}
		}
		window.addEventListener("mousemove", handleCursorMove);

		function handleMouseDown(e: MouseEvent) {
			mouseDownRef.current = true;
		}
		window.addEventListener("mousedown", handleMouseDown);
		function handleMouseUp(e: MouseEvent) {
			mouseDownRef.current = false;
		}
		window.addEventListener("mouseup", handleMouseUp);

		// loop
		function step() {
			if (canvasRef.current === null) return;

			const ctx = canvasRef.current.getContext("2d");
			if (ctx) {
				if (mouseDownRef.current) manager.editPheromones(
					cursorPosRef.current.x,
					cursorPosRef.current.y,
					brushSettingsRef.current.brushSize,
					brushSettingsRef.current.type === "add" ? 1 : brushSettingsRef.current.type === "remove" ? -1 : 0
				);
				manager.update();

				if (displaySettingsRef.current.displayPheromones) manager.drawPheromones(ctx);
				manager.drawAgents(ctx);
				manager.applyDrawing(ctx);
			}

			requestAnimationFrame(step);
		}
		requestAnimationFrame(step);

		return () => {
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("mousemove", handleCursorMove);
		}
	}, []);

	return (
		<div className="flex flex-row w-full h-screen items-center justify-center">
			<canvas
				ref={canvasRef}
			/>

			<div className="absolute top-0 right-0 text-sm text-zinc-500 bg-black px-2 py-1 flex flex-row gap-1 select-none">
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "none" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "none"}))}>No brush</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "add" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "add"}))}>Additive brush</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "remove" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "remove"}))}>Subtractive brush</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={settingsMenuOpen ? { color: "white"} : {}} onClick={() => setSettingsMenuOpen(p => !p)}>{settingsMenuOpen ? "Close" : "Open"} settings</button>
			</div>
			{
				settingsMenuOpen && (
					<div className="absolute top-7 right-5 bg-black/80 p-4 rounded-lg border border-zinc-700 backdrop-blur-md flex flex-col gap-3 w-64">
						<div className="flex flex-row justify-between border-b border-zinc-700 pb-2">
							<p className="text-xl font-bold">Settings</p>
							<button className="text-xl font-bold cursor-pointer" onClick={() => setSettingsMenuOpen(false)}>❌</button>
						</div>

						<p className="font-bold text-sm mt-2">Brush</p>

						<div>
							<label className="text-xs text-zinc-400 block">Brush radius ({brushSettings.brushSize})</label>
							<input type="range" min={20} max={100} step={0.1} className="w-full"
							       value={brushSettings.brushSize}
							       onChange={(e) => setBrushSettings(p => ({...p, brushSize: parseFloat(e.target.value)}))}
							/>
						</div>

						<p className="font-bold text-sm mt-2">Pheromone Behavior</p>

						<div>
							<label className="text-xs text-zinc-400 block">Display Pheromones</label>
							<input
								type="checkbox"
								checked={displaySettings.displayPheromones}
								onChange={(e) => setDisplaySettings(prev => ({
									...prev,
									displayPheromones: e.target.checked
								}))}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Decay ({settings.decay*100}%)</label>
							<input type="range" min={0} max={1} step={0.01} className="w-full"
							       value={settings.decay}
							       onChange={(e) => updateSettings('decay', parseFloat(e.target.value), (v) => manager.setDecay(v))}
							/>
						</div>

						<p className="font-bold text-sm mt-2">Agent Behavior</p>

						<div>
							<label className="text-xs text-zinc-400 block">Num. Agents ({settings.numAgents})</label>
							<input type="range" min={50_000} max={200_000} step={1} className="w-full"
							       value={settings.numAgents}
							       onChange={(e) => updateSettings('numAgents', parseInt(e.target.value), (v) => Manager.getInstance().populate(v))}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Pheromone deposit ({Math.round(settings.pheromoneDeposit*100)}%)</label>
							<input type="range" min={0} max={1} step={0.01} className="w-full"
							       value={settings.pheromoneDeposit}
							       onChange={(e) => updateSettings('pheromoneDeposit', parseFloat(e.target.value), (v) => Agent.setPheromoneDeposit(v))}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Speed ({settings.speed})</label>
							<input type="range" min={0.5} max={15} step={0.1} className="w-full"
							       value={settings.speed}
							       onChange={(e) => updateSettings('speed', parseFloat(e.target.value), Agent.setSpeed)}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Rotate By ({settings.rotateBy}°)</label>
							<input type="range" min={0} max={179} step={1} className="w-full"
							       value={settings.rotateBy}
							       onChange={(e) => updateSettings('rotateBy', parseFloat(e.target.value), Agent.setRotateBy)}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Rotational Noise ({settings.maxNoise}°)</label>
							<input type="range" min={0} max={360} step={1} className="w-full"
							       value={settings.maxNoise}
							       onChange={(e) => updateSettings('maxNoise', parseFloat(e.target.value), Agent.setMaxNoise)}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Sensor Distance ({settings.sensorOffset})</label>
							<input type="range" min={0} max={100} step={1} className="w-full"
							       value={settings.sensorOffset}
							       onChange={(e) => updateSettings('sensorOffset', parseFloat(e.target.value), Agent.setSensorOffset)}
							/>
						</div>

						<div>
							<label className="text-xs text-zinc-400 block">Sensor Angle ({settings.sensorAngleOffset}°)</label>
							<input type="range" min={0} max={179} step={1} className="w-full"
							       value={settings.sensorAngleOffset}
							       onChange={(e) => updateSettings('sensorAngleOffset', parseFloat(e.target.value), Agent.setSensorAngleOffset)}
							/>
						</div>
					</div>
				)
			}
		</div>
	);
}
