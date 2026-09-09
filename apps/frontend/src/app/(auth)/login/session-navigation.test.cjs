const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<div id="root"></div>', {
  url: 'http://localhost/login?returnurl=%2Ftickets',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const { createRoot } = require('react-dom/client');
const { Provider, useDispatch, useSelector } = require('react-redux');
const { configureStore } = require('@reduxjs/toolkit');

function load(file, mocks = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  );
  vm.runInNewContext(outputText, {
    exports,
    require: (name) =>
      Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  });
  return exports;
}

const thunks = load('../../Redux/slices/auth/authThunks.ts');
const slice = load('../../Redux/slices/auth/authSlice.ts', {
  './authThunks': thunks,
});
const selectors = load('../../Redux/slices/auth/authSelectors.ts');
const redirects = [];
const router = { replace: (url) => redirects.push(url) };
const params = new URLSearchParams('returnurl=%2Ftickets');
const Login = load('LoginPageClient.tsx', {
  'next/image': () => null,
  'next/navigation': { useRouter: () => router, useSearchParams: () => params },
  '../../ui/images': { Images: { auth: {}, index: {} } },
  '../../Redux/store': {
    useAppDispatch: useDispatch,
    useAppSelector: useSelector,
  },
  '../../Redux/slices/auth/authThunks': thunks,
  '../../Redux/slices/auth/authSlice': slice,
  '../../Redux/slices/auth/authSelectors': selectors,
  '../../../components/toast/AppToast': { appToast: {} },
  '../../../components/ui/ThemeInput': () => null,
  '../../../components/ui/ThemeButton': ({ children }) =>
    React.createElement('button', null, children),
  '../../../components/modals/ForgotPasswordModal': () => null,
  '../../../lib/auth/return-url': {
    resolveAuthorizedReturnUrl: async (url) => url,
  },
}).default;

async function run() {
  const store = configureStore({ reducer: { auth: slice.default } });
  const profile = {
    id: 'test',
    email: 'test@example.com',
    fullName: 'Test User',
    permissions: [],
  };
  store.dispatch(slice.hydrateAuthFromProfile(profile));
  const root = createRoot(document.getElementById('root'));
  const render = (hasSessionCookie) =>
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          Provider,
          { store },
          React.createElement(Login, { hasSessionCookie }),
        ),
      ),
    );

  // Cookie deletion while the existing Redux store still holds a logged-in user.
  await React.act(async () => render(false));
  assert.equal(store.getState().auth.isAuthenticated, false);
  assert.match(document.body.textContent, /Welcome back/);
  assert.equal(redirects.length, 0);

  // A subsequent successful login must still return to the requested page.
  await React.act(async () =>
    store.dispatch(slice.hydrateAuthFromProfile(profile)),
  );
  assert.deepEqual(redirects, ['/tickets']);

  // An existing session can redirect, and a later missing-cookie server result
  // must reconcile even if React reuses the same login component.
  await React.act(async () => render(true));
  redirects.length = 0;
  await React.act(async () => render(false));
  assert.equal(store.getState().auth.isAuthenticated, false);
  assert.match(document.body.textContent, /Welcome back/);
  assert.equal(redirects.length, 0);

  await React.act(async () => root.unmount());
  dom.window.close();
  console.log(
    'Passed: stale login state, login form rendering, post-login return URL, and cookie-state changes.',
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
