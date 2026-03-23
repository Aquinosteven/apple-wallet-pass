import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { getSeoConfig, renderSeoHeadMarkup } from './bolt/components/Seo';

export function renderPath(pathname: string) {
  return renderToString(
    <StaticRouter location={pathname}>
      <AppRoutes />
    </StaticRouter>
  );
}

export function renderHead(pathname: string) {
  return renderSeoHeadMarkup(getSeoConfig(pathname));
}
