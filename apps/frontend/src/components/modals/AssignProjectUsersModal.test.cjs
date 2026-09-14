const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

test('keeps selections across search results and clears them on close', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  let modalProps;
  let assignedIds;
  const mocks = {
    './AppModal': (props) => {
      modalProps = props;
      return props.isOpen ? props.children : null;
    },
    '../../../public/icons': new Proxy({}, { get: () => () => null }),
    './ProjectUsersModal': { formatProjectUserRoleName: (role) => role },
    '../EmptyState': () => null,
    'next/image': () => null,
  };
  const exports = {};
  const { outputText } = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, 'AssignProjectUsersModal.tsx'),
      'utf8',
    ),
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
  const root = createRoot(document.getElementById('root'));
  const alice = { id: 'alice', fullName: 'Alice', email: 'alice@example.com' };
  const bob = { id: 'bob', fullName: 'Bob', email: 'bob@example.com' };
  const render = async (users, extra = {}) =>
    React.act(async () => {
      root.render(
        React.createElement(exports.default, {
          isOpen: true,
          projectName: 'Project',
          users,
          onClose: () => {
            '';
          },
          onAssign: (ids) => {
            assignedIds = ids;
          },
          ...extra,
        }),
      );
    });
  try {
    await render([alice]);
    await React.act(async () =>
      document.querySelector('input[type="checkbox"]').click(),
    );
    await render([], { isLoading: true });
    assert.equal(modalProps.confirmLabel, 'Assign Selected 1');
    await render([bob]);
    await React.act(async () =>
      document.querySelector('input[type="checkbox"]').click(),
    );
    await render([]);
    assert.equal(modalProps.confirmLabel, 'Assign Selected 2');
    modalProps.onConfirm();
    assert.deepEqual(Array.from(assignedIds), ['alice', 'bob']);
    await render([alice, bob]);
    assert.ok(
      [...document.querySelectorAll('input[type="checkbox"]')].every(
        (input) => input.checked,
      ),
    );
    await React.act(async () =>
      document.querySelector('input[type="checkbox"]').click(),
    );
    assert.equal(modalProps.confirmLabel, 'Assign Selected 1');
    await render([], { isOpen: false });
    await render([alice, bob]);
    assert.equal(modalProps.confimBtnDisable, true);
    assert.ok(
      [...document.querySelectorAll('input[type="checkbox"]')].every(
        (input) => !input.checked,
      ),
    );
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
