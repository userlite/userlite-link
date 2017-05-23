'use babel';

import UserliteLink from '../lib/userlite-link';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('UserliteLink', () => {
  let workspaceElement, activationPromise;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('userlite-link');
  });

  describe('when the userlite-link:toggle event is triggered', () => {
    it('hides and shows the modal panel', () => {
      // Before the activation event the view is not on the DOM, and no panel
      // has been created
      expect(workspaceElement.querySelector('.userlite-link')).not.toExist();

      // This is an activation event, triggering it will cause the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'userlite-link:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        expect(workspaceElement.querySelector('.userlite-link')).toExist();

        let userliteLinkElement = workspaceElement.querySelector('.userlite-link');
        expect(userliteLinkElement).toExist();

        let userliteLinkPanel = atom.workspace.panelForItem(userliteLinkElement);
        expect(userliteLinkPanel.isVisible()).toBe(true);
        atom.commands.dispatch(workspaceElement, 'userlite-link:toggle');
        expect(userliteLinkPanel.isVisible()).toBe(false);
      });
    });

    it('hides and shows the view', () => {
      // This test shows you an integration test testing at the view level.

      // Attaching the workspaceElement to the DOM is required to allow the
      // `toBeVisible()` matchers to work. Anything testing visibility or focus
      // requires that the workspaceElement is on the DOM. Tests that attach the
      // workspaceElement to the DOM are generally slower than those off DOM.
      jasmine.attachToDOM(workspaceElement);

      expect(workspaceElement.querySelector('.userlite-link')).not.toExist();

      // This is an activation event, triggering it causes the package to be
      // activated.
      atom.commands.dispatch(workspaceElement, 'userlite-link:toggle');

      waitsForPromise(() => {
        return activationPromise;
      });

      runs(() => {
        // Now we can test for view visibility
        let userliteLinkElement = workspaceElement.querySelector('.userlite-link');
        expect(userliteLinkElement).toBeVisible();
        atom.commands.dispatch(workspaceElement, 'userlite-link:toggle');
        expect(userliteLinkElement).not.toBeVisible();
      });
    });
  });
});
