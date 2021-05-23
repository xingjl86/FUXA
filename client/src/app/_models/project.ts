import { Device } from './device';
import { Hmi } from './hmi';
import { Chart } from './chart';
import { Alarm } from './alarm';
import { Text } from './text';

export class ProjectData {
    version: string = "1.00";
    /** FUXA Server */
    server: Device = new Device();
    /** Hmi resource, layout, SVG, etc. */
    hmi: Hmi = new Hmi();
    /** Devices, connection, Tags, etc. */
    devices = {};
    /** Charts, Tags, colors, etc. */
    charts: Chart[] = [];
    /** Alarms, Tags, logic, level, colors, etc.  */
    alarms: Alarm[] = [];
    /** not used yet */
    texts: Text[] = [];
    /** Plugins, name, version */
    plugin: Plugin[] = [];
}

export enum ProjectDataCmdType {
    SetDevice = 'set-device',
    DelDevice = 'del-device',
    SetView = 'set-view',
    DelView = 'del-view',
    HmiLayout = 'layout',
    Charts = 'charts',
    SetText = 'set-text',
    DelText = 'del-text',
    SetAlarm = 'set-alarm',
    DelAlarm = 'del-alarm',
}