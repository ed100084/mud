import { GameEngine } from './game'

const app = document.getElementById('app')!
const engine = new GameEngine()
engine.init(app).catch(console.error)
