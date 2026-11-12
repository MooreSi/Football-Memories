/** Reload the page onto the newly installed version (its own module so tests can replace it). */
export function reloadPage(): void {
  window.location.reload();
}
