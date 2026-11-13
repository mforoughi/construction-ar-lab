/** Shared teaching prompts for the viewer and the instructor's recording script. */
export const GUIDES = Object.freeze({
  sheet: {
    title: 'Sheet mode', kind: 'guide-sheet',
    steps: [
      'Select On sheet. If the camera has not opened, tap Start sheet AR and allow camera access. Place the printed tracking sheet flat in good light.',
      'Point your phone at the full printed sheet, including its border. Hold steady until the model appears. The QR code opens the project; the full sheet anchors the model.',
      'Move your phone slowly to view the model from different angles. Move a little closer to inspect connections, while keeping the whole tracking sheet in view. If the model disappears, pull back and point at the full sheet again.',
      'If a linked schedule is available, tap Play to watch construction. Tap Pause to study a stage, drag the timeline to another day, or tap Complete to show the full model.',
      'Open Explore model for Explode and Cutaway. In the camera view, drag a visible component to pull it apart, or drag the orange handle up and down to see inside. Reset inspection restores the assembly.',
      'Explore the building structure. Identify any columns, beams, slabs, and roof members shown. Notice how they connect, and trace a possible load path from a floor through its supports to the foundation, if those elements are present.',
      'Compare two construction stages. Which structural members appear first? Which later members depend on them? Use only the elements and sequence actually shown in this project.'
    ]
  },
  floor: {
    title: 'Floor mode', kind: 'guide-floor',
    steps: [
      'Select On floor. If the camera has not opened, tap Start floor AR and allow camera and motion access when asked. Choose an open, well-lit area with room to move.',
      'Move your phone slowly, then aim down at the floor. When the gold ring appears at your chosen location, tap Place here. Placement uses an estimated floor level.',
      'Open Adjust model to change Size, Rotate, or Height. Use Height if the model appears to float or sink. Tap Reposition to choose another location.',
      'Walk slowly around the model to view different sides, checking the real space around you. Move your phone closer to inspect structural connections, then step back for the overall view.',
      'If a linked schedule is available, tap Play to watch construction. Tap Pause to study a stage, drag the timeline to another day, or tap Complete to show the full model.',
      'Open Explore model for Explode and Cutaway. Drag a visible component to pull it apart, or drag the orange handle up and down to see inside. Reset inspection restores the assembly.',
      'Identify any columns, beams, slabs, and roof members shown. Notice how they connect. Trace a possible load path through the supports to the foundation, if present. Compare two stages and explain which members need to be built first.'
    ]
  }
});
export const guideScript = mode => GUIDES[mode === 'floor' ? 'floor' : 'sheet'].steps.join('\n\n');

export function setupProjectGuide({mode, button, dialog}) {
  const guide = GUIDES[mode === 'floor' ? 'floor' : 'sheet'];
  dialog.querySelector('h2').textContent = guide.title + ' · Instructions';
  const list = dialog.querySelector('ol');
  list.replaceChildren();
  for (const step of guide.steps) {
    const item = document.createElement('li'); item.textContent = step; list.append(item);
  }
  button.disabled = false;
  button.onclick = () => dialog.showModal();
  dialog.querySelector('button').onclick = () => dialog.close();
}
