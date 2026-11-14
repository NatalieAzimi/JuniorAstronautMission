export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold">Junior Astronaut Mission Trainer</h1>
      <p className="text-slate-300">Can you keep your outpost alive for 30 sols?</p>
      <div className="flex gap-4">
        <button className="px-6 py-3 rounded-lg bg-gray-500 hover:bg-gray-400">Moon</button>
        <button className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500">Mars</button>
      </div>
    </main>
  );
}