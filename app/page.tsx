"use client";
import {useEffect, useRef, useState} from "react";
import {Manager} from "@/app/Manager";
import {Agent} from "@/app/Agent";

export default function Home() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const settingsMenuRef = useRef<HTMLDivElement | null>(null);
	const functionBarRef = useRef<HTMLDivElement | null>(null);
	const disableMouseEventsRef = useRef(false); // used to disable mouse events when hovering over the settings menu or function bar

	const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
	const [brushSettings, setBrushSettings] = useState<
		{
			type: "none" | "add" | "add_agents" | "remove",
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
		numAgents: 40_000,
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

		function handleCursorMove(e: MouseEvent) {
			cursorPosRef.current = {
				x: e.clientX,
				y: e.clientY
			}

			const settingsRect = settingsMenuRef.current?.getBoundingClientRect();
			const functionBarRect = functionBarRef.current?.getBoundingClientRect();

			if (
				(settingsRect && e.clientX >= settingsRect.left && e.clientX <= settingsRect.right && e.clientY >= settingsRect.top && e.clientY <= settingsRect.bottom) ||
				(functionBarRect && e.clientX >= functionBarRect.left && e.clientX <= functionBarRect.right && e.clientY >= functionBarRect.top && e.clientY <= functionBarRect.bottom)
			) {
				disableMouseEventsRef.current = true;
			} else {
				disableMouseEventsRef.current = false;
			}
		}
		window.addEventListener("mousemove", handleCursorMove);

		function handleMouseDown() {
			mouseDownRef.current = true;
		}
		window.addEventListener("mousedown", handleMouseDown);
		function handleMouseUp() {
			mouseDownRef.current = false;
		}
		window.addEventListener("mouseup", handleMouseUp);

		// loop
		function step() {
			if (canvasRef.current === null) return;

			const ctx = canvasRef.current.getContext("2d");
			if (ctx) {
				if (mouseDownRef.current && !disableMouseEventsRef.current) {
					switch (brushSettingsRef.current.type) {
						case "add":
						case "remove":
							manager.editPheromones(
								cursorPosRef.current.x,
								cursorPosRef.current.y,
								brushSettingsRef.current.brushSize,
								brushSettingsRef.current.type === "add" ? 1 : brushSettingsRef.current.type === "remove" ? -1 : 0
							);
							break;
						case "add_agents":
							manager.populateRegion(
								cursorPosRef.current.x,
								cursorPosRef.current.y,
								brushSettingsRef.current.brushSize,
							)
							break;
					}
				}
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

			<div className="absolute top-0 right-0 text-sm text-zinc-500 bg-black px-2 py-1 flex flex-row gap-1 select-none" ref={functionBarRef}>
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "none" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "none"}))}>No brush</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "add_agents" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "add_agents"}))}>Agent brush</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "add" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "add"}))}>Pheromone brush</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={brushSettings.type === "remove" ? { color: "white"} : {}} onClick={() => setBrushSettings(p => ({...p, type: "remove"}))}>Pheromone eraser</button>
				<p>|</p>
				<button className="hover:text-white cursor-pointer" style={settingsMenuOpen ? { color: "white"} : {}} onClick={() => setSettingsMenuOpen(p => !p)}>{settingsMenuOpen ? "Close" : "Open"} settings</button>
			</div>
			{
				settingsMenuOpen && (
					<div className="absolute top-7 right-5 bg-black/80 p-4 rounded-lg border border-zinc-700 backdrop-blur-md flex flex-col gap-3 w-64 select-none" ref={settingsMenuRef}>
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
							<input type="range" min={5_000} max={50_000} step={1} className="w-full"
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
