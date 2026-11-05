import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/lexend/400.css';
import '@fontsource/lexend/500.css';
import '@fontsource/lexend/600.css';
import '@fontsource/lexend/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/jetbrains-mono/400.css';
import { App } from './ui/App';
import {SumoPage} from './ui/SumoPage';
import {CompetitionPage} from './classroom/CompetitionPage';
import './ui/theme.css';
import './ui/playground.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{new URLSearchParams(location.search).has('competition')?<main><CompetitionPage/></main>:new URLSearchParams(location.search).has('sumo')?<main><SumoPage/></main>:<App/>}</React.StrictMode>,
);
