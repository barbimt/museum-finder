import './App.css'
import MuseumSearch from './components/MuseumSearch'

const App = () => (
  <>
    <header className="site-header">
      <div className="site-header__inner">
        <span className="site-header__mark" aria-hidden="true">
          M
        </span>
        <span className="site-header__wordmark">Museum Finder</span>
      </div>
    </header>
    <main className="page">
      <div className="intro">
        <h1 className="intro__title">Discover museums</h1>
        <p className="intro__lede">
          Search for museums and explore their locations.
        </p>
      </div>
      <MuseumSearch />
    </main>
  </>
)

export default App
