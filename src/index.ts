import { main } from "./main";

// Catch the initial URL before any redirects happen or the page modifiers URL.
// Has to happen as soon as possible.
const initialUrl = window.location.href;

window.addEventListener("load", () => {
  main({ initialUrl });
});
