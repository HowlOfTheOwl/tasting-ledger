// Shared app context. main.js fills in the functions; the screens register their actions here.
// Elements use data-act="name" (click), data-in="name" (typing) and data-ch="name" (file pickers);
// data-go="#route" navigates.
export const app = {
  ui: {},
  actions: {},
  inputs: {},
  changes: {},
  render() {},
  rerender() {},
  go(_hash) {},
  toast(_msg) {},
};
