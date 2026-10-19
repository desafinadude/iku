import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APIProvider } from '@vis.gl/react-google-maps'
import App from './App'
import { GOOGLE_KEY, useGoogleMaps } from './maps/config'
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
