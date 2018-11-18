import {busActive, busControllable, transientActive} from "../network/telemetry";

class OntimeUI {
    slider: HTMLInputElement;//TODO is this correct? Initialization?

}

const ontime = new OntimeUI();

export function updateSliderAvailability() {
    const busMaybeActive = busActive || !busControllable;
    const offDisable = !(transientActive && busMaybeActive);
    for (let i = 1; i <= 3; ++i) {
        const slider = $(".w2ui-panel-content .scopeview #slider" + i)[0];
        slider.className = offDisable?"slider-gray":"slider";
    }
    const onDisable = !busMaybeActive;
    ontime.slider.className = onDisable?"slider-gray":"slider";
}