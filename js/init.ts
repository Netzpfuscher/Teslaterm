import * as fs from "fs";
import * as $ from 'jquery';
import {TTConfig} from "./TTConfig";
import {terminal} from './gui/constants';
import {NUM_GAUGES} from "./gui/gauges";
import * as gauges from "./gui/gauges";
import * as gui from './gui/gui';
import * as menu from './gui/menu';
import * as scope from './gui/oscilloscope/oscilloscope';
import * as sliders from './gui/sliders';
import * as midi from "./midi/midi";
import {maxBPS, maxBurstOfftime, maxBurstOntime, maxOntime} from "./network/commands";
import * as connection from "./connection/connection";
import * as sid from "./sid/sid";

export let config: TTConfig;
export const simulated = true;

export function init() {
    document.addEventListener('DOMContentLoaded', () => {

        $(() => {
            $('#toolbar').w2toolbar({
                items: [
                    {
                        icon: 'fa fa-table', id: 'mnu_command', items: [
                            {text: 'TR Start', icon: 'fa fa-bolt', id: 'transient'},
                            {text: 'Save EEPROM-Config', icon: 'fa fa-microchip'},
                            {text: 'Load EEPROM-Config', icon: 'fa fa-microchip'},
                            {text: 'Settings', id: 'settings', icon: 'fa fa-table'},
                            {text: 'Start MIDI server', id: 'startStopMidi', icon: 'fa fa-table'},
                        ], text: 'Commands', type: 'menu',
                    },
                    {
                        icon: 'fa fa-star', id: 'trigger_radio',
                        items: [
                            {id: 'waveoff-1', text: 'Off'},
                            {id: 'waveoid0', text: 'Wave 0'},
                            {id: 'waveoid1', text: 'Wave 1'},
                            {id: 'waveoid2', text: 'Wave 2'},
                            {id: 'waveoid3', text: 'Wave 3'},
                            {id: 'waveoid4', text: 'Wave 4'},
                            {id: 'waveoid5', text: 'Wave 5'},
                        ],
                        selected: 'waveoff-1',
                        type: 'menu-radio',
                        text(item) {
                            const el = this.get('trigger_radio:' + item.selected);
                            const triggerId = item.selected.substr(7);
                            scope.setTrigger(Number(triggerId));
                            return 'Trigger: ' + el.text;
                        },
                    },
                    {
                        icon: 'fa fa-table', id: 'mnu_midi', items: [
                            {text: 'Play', icon: 'fa fa-bolt'},
                            {text: 'Stop', icon: 'fa fa-bolt'},
                        ],
                        text: 'MIDI-File: none', type: 'menu',
                    },

                    {
                        icon: 'fa fa-table', id: 'mnu_script', items: [
                            {text: 'Start', icon: 'fa fa-bolt'},
                            {text: 'Stop', icon: 'fa fa-bolt'},
                        ], text: 'Script: none', type: 'menu',
                    },
                    {type: 'spacer'},
                    {type: 'button', id: 'connect', text: 'Connect', icon: 'fa fa-plug'},
                    {type: 'button', id: 'kill_set', text: 'KILL SET', icon: 'fa fa-power-off'},
                    {type: 'button', id: 'kill_reset', text: 'KILL RESET', icon: 'fa fa-power-off'},
                    {type: 'button', id: 'cls', text: 'Clear Term', icon: 'fa fa-terminal'},
                ],
                name: 'toolbar',
                onClick: menu.onCtrlMenuClick,
            });
            readConfig("config.ini");
        });

        let html_gauges = '';
        for (let i = 0; i < NUM_GAUGES; i++) {
            html_gauges += '<div id="gauge' + i + '" style= "width: 100px; height: 100px"></div>';
        }

        const pstyle = 'background-color: #F5F6F7;  padding: 5px;';
        $('#layout').w2layout({
            name: 'layout',
            panels: [
                {
                    content:
                        '<div id="toolbar" style="padding: 4px; border: 1px solid #dfdfdf; border-radius: 3px"></div>',
                    overflow: "hidden", resizable: false, size: 50, style: pstyle, type: 'top',
                },
                {
                    content:
                        '<div class="scopeview">' +
                        '<article>' +
                        '<canvas id="backCanvas" style= "position: absolute; left: 0; top: 0; width: 75%; background: black; z-index: 0;"></canvas>' +
                        '<canvas id="waveCanvas" style= "position: absolute; left: 0; top: 0;width: 75%; z-index: 1;"></canvas>' +
                        '</article>' +
                        '<aside>' +
                        '<div id="ontime">Ontime<br><br>' +
                        '<input type="range" id="slider" min="0" max="' + maxOntime + '" value="0" class="slider-gray" data-show-value="true">' +
                        '<span id="total">0</span> µs (<span id="relative">100</span>% of <span id="absolute"><b>0</b></span> µs)' +
                        '<br><input type="checkbox" id="relativeSelect"><label for="relativeSelect">Relative</label></div>' +
                        '<br><br>Offtime<br><br>' +
                        '<input type="range" id="slider1" min="20" max="' + maxBPS + '" value="1" class="slider-gray" data-show-value="true"><label id="slider1_disp">20 Hz</label>' +
                        '<br><br>Burst On<br><br>' +
                        '<input type="range" id="slider2" min="0" max="' + maxBurstOntime + '" value="0" class="slider-gray" data-show-value="true"><label id="slider2_disp">0 ms</label>' +
                        '<br><br>Burst Off<br><br>' +
                        '<input type="range" id="slider3" min="0" max="' + maxBurstOfftime + '" value="500" class="slider-gray" data-show-value="true"><label id="slider3_disp">500 ms</label>' +
                        '<br><br>MIDI Input: <select id="midiIn"></select>' +
                        '<br>MIDI Output: <select id="midiOut"></select>' +
                        '</aside>' +
                        '</div>',
                    style: pstyle, type: 'main',
                },
                {
                    content: html_gauges, resizable: false, size: 120, style: pstyle, type: 'right',
                },

                {
                    content:
                        '<div id="terminal" style="position:relative; width:100%; height:100%"></div>',
                    resizable: true, size: '50%', style: pstyle, type: 'preview',
                },

            ],
        });
        w2ui.layout.on({type: 'resize', execute: 'after'}, () => {
            scope.onResize();
        });
        terminal.decorate(document.querySelector('#terminal'));
        terminal.installKeyboard();

        gui.init();
        sliders.init();

        scope.init();
        midi.init();
        // midi_server.init();
        setInterval(update, 20);
    });
}

function readConfig(file: string) {
    //TODO wait until config is loaded?
    config = new TTConfig(file);

    //TODO reimplement
    //if (config.autoconnect) {
    //    connection.pressButton(config.port);
    //}
}

// Called every 20 ms
function update() {
    const updateButton = connection.update();
    if (updateButton) {
        menu.updateConnectionButton(
            connection.connectionState.getButtonText(),
            connection.connectionState.getButtonTooltip()
        );
    }

    gauges.refresh_all();

    sid.update();
}
