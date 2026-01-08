// CSS will be handled by Next.js global styles
// import './App.css'
import Sidebar from './components/Sidebar'
import AgentCreation from './components/AgentCreation'
import ChatWindow from './components/ChatWindow'

function App() {
  return (
    <div className="flex h-screen overflow-hidden relative z-50">
      <div className="w-[260px] h-screen relative z-51">
        <Sidebar />
      </div>
      <div className="w-[570px] h-screen relative z-52">
        <AgentCreation />
      </div>
      <div className="w-[700px] h-screen relative z-53">
        <ChatWindow />
      </div>
    </div>
  )
}

// Named export for Next.js compatibility
export { App };
export default App
