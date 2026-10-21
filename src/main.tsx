import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APIProvider } from '@vis.gl/react-google-maps'
import App from './App'
import { GOOGLE_KEY, useGoogleMaps } from './maps/config'
import { loadLucide } from './labels/lucide'

// Start loading the tag icon set straight away so icons are ready by the time the trip appears.
loadLucide()
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useGoogleMaps ? (
      <APIProvider apiKey={GOOGLE_KEY} libraries={['places', 'marker']}>
        <App />
      </APIProvider>
    ) : (
      <App />
    )}
  </StrictMode>
)
