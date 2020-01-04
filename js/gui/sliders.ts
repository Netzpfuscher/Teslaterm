import {busActive, busControllable, transientActive} from "../network/telemetry";
import * as $ from "jquery";
import {terminal} from "./gui";
import * as commands from '../network/commands';
import * as midiServer from '../midi/midi_server';

export class OntimeUI {
    slider: HTMLInputElement;
    relativeSelect: HTMLInputElement;
    total: HTMLSpanElement;
    relative: HTMLSpanElement;
    absolute: HTMLSpanElement;
    absoluteVal: number = 0;
    relativeVal: number = 100;
    totalVal: number = 0;

    setRelativeAllowed(allow:boolean) {
        if (allow) {
            this.relativeSelect.disabled = false;
        } else {
            this.relativeSelect.checked = false;
            this.relativeSelect.onclick(new MouseEvent("click"));
            this.relativeSelect.disabled = true;
        }
    }

    setToZero() {
        if (this.relativeSelect.checked) {
            this.setRelativeOntime(0);
        } else {
            this.setAbsoluteOntime(0);
        }
    }

    setAbsoluteOntime(time: number) {
        if (!this.relativeSelect.checked) {
            setSliderValue(null, time, this.slider);
        }
        time = Math.min(commands.maxOntime, Math.max(0, time));
        this.absoluteVal = time;
        this.absolute.textContent = this.absoluteVal.toString();
        this.ontimeChanged();
    }

    setRelativeOntime(percentage: number) {
        console.log(this);
        if (this.relativeSelect.checked) {
            setSliderValue(null, percentage, this.slider);
        }
        percentage = Math.min(100, Math.max(0, percentage));
        this.relativeVal = percentage;
        this.relative.textContent =this.relativeVal.toString();
        midiServer.sendRelativeOntime(this.relativeVal);
        this.ontimeChanged();
    }

    updateOntimeLabels() {
        if (this.relativeSelect.checked) {
            this.relative.innerHTML = "<b>"+this.relativeVal+"</b>";
            this.absolute.innerHTML = this.absoluteVal.toFixed();
        } else {
            this.absolute.innerHTML = "<b>"+this.absoluteVal+"</b>";
            this.relative.innerHTML = this.relativeVal.toFixed();
        }
        this.total.innerHTML = this.totalVal.toFixed();
    }

    onRelativeOntimeSelect() {
        if (this.relativeSelect.checked) {
            this.slider.max = '100';
            this.slider.value = this.relativeVal.toFixed();
        } else {
            this.slider.max = commands.maxOntime.toFixed();
            this.slider.value = this.absoluteVal.toFixed();
        }
        this.updateOntimeLabels();
    }

    onSliderMoved(){
        if (this.relativeSelect.checked) {
            this.setRelativeOntime(parseInt(this.slider.value));
        } else {
            this.setAbsoluteOntime(parseInt(this.slider.value));
        }
    }

    ontimeChanged() {
        this.totalVal = Math.round(this.absoluteVal*this.relativeVal/100.);
        commands.setOntime(this.totalVal);
        this.updateOntimeLabels();
    }
}

export const ontime = new OntimeUI();

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

export function init() {
    ontime.slider =<HTMLInputElement> $(".w2ui-panel-content .scopeview #ontime #slider")[0];
    ontime.relativeSelect =<HTMLInputElement> $(".w2ui-panel-content .scopeview #ontime #relativeSelect")[0];
    ontime.total = $(".w2ui-panel-content .scopeview #ontime #total")[0];
    ontime.relative = $(".w2ui-panel-content .scopeview #ontime #relative")[0];
    ontime.absolute = $(".w2ui-panel-content .scopeview #ontime #absolute")[0];
    ontime.slider.addEventListener("input", ()=>ontime.onSliderMoved());
    ontime.relativeSelect.onclick = ()=>ontime.onRelativeOntimeSelect();
    $('#slider1')[0].addEventListener("input", slider1);
    $('#slider2')[0].addEventListener("input", slider2);
    $('#slider3')[0].addEventListener("input", slider3);
}

function setSliderValue(name, value, slider = undefined) {
    if (!slider) {
        slider = document.getElementById(name);
    }
    if (value<slider.min||value>slider.max) {
        terminal.io.println("Tried to set slider \""+slider.id+"\" out of range (To "+value+")!");
        value = Math.min(slider.max, Math.max(slider.min, value));
    }
    slider.value = value;
}

function slider1(){
    const slider = <HTMLInputElement>document.getElementById('slider1');
    const slider_disp = document.getElementById('slider1_disp');
    slider_disp.innerHTML = slider.value + ' Hz';
    commands.setBPS(Number(slider.value));
}

export function setBPS(bps){
    setSliderValue("slider1", bps);
    slider1();
}

export function getBPS(): number {
    const slider = <HTMLInputElement>document.getElementById("slider1");
    return Number(slider.value);
}

function slider2(){
    const slider: HTMLInputElement = <HTMLInputElement>document.getElementById('slider2');
    const slider_disp = document.getElementById('slider2_disp');
    slider_disp.innerHTML = slider.value + ' ms';
    commands.setBurstOntime(Number(slider.value));
}

export function setBurstOntime(time){
    setSliderValue("slider2", time);
    slider2();
}

export function getBurstOntime(): number {
    const slider = <HTMLInputElement>document.getElementById("slider2");
    return Number(slider.value);
}

function slider3(){
    const slider = <HTMLInputElement>document.getElementById('slider3');
    const slider_disp = document.getElementById('slider3_disp');
    slider_disp.innerHTML = slider.value + ' ms';
    commands.setBurstOfftime(Number(slider.value))
}

export function setBurstOfftime(time){
    setSliderValue("slider3", time);
    slider3();
}

export function getBurstOfftime(): number {
    const slider = <HTMLInputElement>document.getElementById("slider3");
    return Number(slider.value);
}

