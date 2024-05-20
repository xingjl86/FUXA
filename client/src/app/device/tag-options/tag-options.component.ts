import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FuxaServer, TagDaq, TagScale, TagScaleModeType } from '../../_models/device';
import { Utils, jsonValidator } from '../../_helpers/utils';
import { ProjectService } from '../../_services/project.service';
import { Subscription } from 'rxjs';
import { Script, ScriptMode, ScriptParam, ScriptParamType } from '../../_models/script';

class ScriptAndParam extends ScriptParam {
    scriptId: string;
}
@Component({
    selector: 'app-tag-options',
    templateUrl: './tag-options.component.html',
    styleUrls: ['./tag-options.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagOptionsComponent implements OnInit, OnDestroy {

    formGroup: UntypedFormGroup;
    scaleModeType = TagScaleModeType;
    scripts: Script[];
    selectedReadScript: Script;
    selectedWriteScript: Script;
    configedReadParams: {[key: string]: ScriptAndParam[]} = {};
    configedWriteParams: {[key: string]: ScriptParam[]} = {};

    private subscriptionLoad: Subscription;

    constructor(
        public dialogRef: MatDialogRef<TagOptionsComponent>,
        private fb: UntypedFormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private projectService: ProjectService) {
    }

    ngOnInit() {
        this.loadScripts();
        this.subscriptionLoad = this.projectService.onLoadHmi.subscribe(res => {
            this.loadScripts();
        });
        this.formGroup = this.fb.group({
            interval: [{value: 60, disabled: true}, [Validators.required, Validators.min(0)]],
            changed: [{value: false, disabled: true}],
            enabled: [false],
            restored: [false],
            format: [null, [Validators.min(0)]],
            scaleMode: 'undefined',
            rawLow: null,
            rawHigh: null,
            scaledLow: null,
            scaledHigh: null,
            dateTimeFormat: null,
            scaleRead: null,
            scaleReadFunction: null,
            scaleReadParams: this.fb.array([]),
            scaleWriteFunction: null,
            scaleWriteParams: null,
        });

        this.formGroup.controls.enabled.valueChanges.subscribe(enabled => {
            if (enabled) {
                this.formGroup.controls.interval.enable();
                this.formGroup.controls.changed.enable();
            } else {
                this.formGroup.controls.interval.disable();
                this.formGroup.controls.changed.disable();
            }
        });

        // check if edit a group
        if (this.data.tags.length > 0) {
            let enabled = { value: null, valid: true };
            let changed = { value: null, valid: true };
            let interval = { value: null, valid: true };
            let restored = { value: null, valid: true };
            let format = { value: null, valid: true };
            let scaleMode = { value: null, valid: true };
            let rawLow = { value: null, valid: true };
            let rawHigh = { value: null, valid: true };
            let scaledLow = { value: null, valid: true };
            let scaledHigh = { value: null, valid: true };
            let dateTimeFormat = { value: null, valid: true };
            let scaleReadFunction = { value: null, valid: true };
            let scaleReadParams = { value: [], valid: true };
            let scaleWriteFunction = { value: null, valid: true };
            let scaleWriteParams = { value: null, valid: true };
            for (let i = 0; i < this.data.tags.length; i++) {
                if (!this.data.tags[i].daq) {
                    continue;
                }
                let daq = <TagDaq>this.data.tags[i].daq;
                if (!enabled.value) {
                    enabled.value = daq.enabled;
                } else if (enabled.value !== daq.enabled) {
                    enabled.valid = false;
                }
                if (!changed.value) {
                    changed.value = daq.changed;
                } else if (changed.value !== daq.changed) {
                    changed.valid = false;
                }
                if (!restored.value) {
                    restored.value = daq.restored;
                } else if (restored.value !== daq.restored) {
                    restored.valid = false;
                }
                if (Utils.isNullOrUndefined(interval.value)) {
                    interval.value = daq.interval;
                } else if (interval.value !== daq.interval) {
                    interval.valid = false;
                }
                if (!format.value) {
                    format.value = this.data.tags[i].format;
                } else if (format.value !== this.data.tags[i].format) {
                    format.valid = false;
                }
                if (!scaleMode.value) {
                    scaleMode.value = this.data.tags[i].scale?.mode;
                    rawLow.value = this.data.tags[i].scale?.rawLow;
                    rawHigh.value = this.data.tags[i].scale?.rawHigh;
                    scaledLow.value = this.data.tags[i].scale?.scaledLow;
                    scaledHigh.value = this.data.tags[i].scale?.scaledHigh;
                    dateTimeFormat.value = this.data.tags[i].scale?.dateTimeFormat;
                } else if (scaleMode.value !== this.data.tags[i].scale?.mode) {
                    scaleMode.valid = false;
                }
                if (!scaleReadFunction.value) {
                    scaleReadFunction.value = this.data.tags[i].scaleReadFunction;
                }
                //if (scaleReadParams.value.length === 0) {
                    //scaleReadParams.value = this.data.tags[i].scaleReadParams;
                    const script = this.scripts.find(s => s.id === this.data.tags[i].scaleReadFunction);
                    if (this.data.tags[i].scaleReadParams) {
                        const tagParams = JSON.parse(this.data.tags[i].scaleReadParams) as ScriptParam[];
                        const notValid = this.initializeScriptParams(script, tagParams, this.configedReadParams);
                        // if (notValid) {
                        //     scaleReadParams.value = undefined;
                        // }
                    }
                //}
                if (!scaleWriteFunction.value) {
                    scaleWriteFunction.value = this.data.tags[i].scaleWriteFunction;
                }
                if (!scaleWriteParams.value) {
                    scaleWriteParams.value = this.data.tags[i].scaleWriteParams;
                    const script = this.scripts.find(s => s.id === this.data.tags[i].scaleWriteFunction);
                    if (this.data.tags[i].scaleWriteParams) {
                        const tagParams = JSON.parse(this.data.tags[i].scaleWriteParams) as ScriptParam[];
                        const notValid = this.initializeScriptParams(script, tagParams, this.configedWriteParams);
                        if (notValid) {
                            scaleWriteParams.value = undefined;
                        }
                    }
                }
            }
            let values = {};
            if (enabled.valid && enabled.value !== null) {
                values = {...values, enabled: enabled.value};
            }
            if (changed.valid && changed.value !== null) {
                values = {...values, changed: changed.value};
            }
            if (restored.valid && restored.value !== null) {
                values = {...values, restored: restored.value};
            }
            if (interval.valid && !Utils.isNullOrUndefined(interval.value)) {
                values = {...values, interval: interval.value};
            }
            if (format.valid && format.value) {
                values = {...values, format: format.value};
            }
            if (scaleMode.valid && scaleMode.value) {
                values = {...values,
                    scaleMode: scaleMode.value,
                    rawLow: rawLow.value,
                    rawHigh: rawHigh.value,
                    scaledLow: scaledLow.value,
                    scaledHigh: scaledHigh.value,
                    dateTimeFormat: dateTimeFormat.value
                };
            }
            if (scaleReadFunction.valid && scaleReadFunction.value) {
                values = {...values, scaleReadFunction: scaleReadFunction.value};
            }
            if (scaleReadParams.valid && scaleReadParams.value) {
                values = {...values, scaleReadParams: scaleReadParams.value};
            }
            if (scaleWriteFunction.valid && scaleWriteFunction.value) {
                values = {...values, scaleWriteFunction: scaleWriteFunction.value};
            }
            if (scaleWriteParams.valid && scaleWriteParams.value) {
                values = {...values, scaleWriteParams: scaleWriteParams.value};
            }
            this.formGroup.patchValue(values);
            //this.loadParamsFormArray(this.configedReadParams, this.scaleReadParams);
            //this.formGroup.setControl('scaleRead', this.initScripsFC('readscripts', this.configedReadParams));
            if (this.data.device?.id === FuxaServer.id) {
                this.formGroup.controls.scaleMode.disable();
            }
            this.formGroup.updateValueAndValidity();
            this.onCheckScaleMode(this.formGroup.value.scaleMode);
            this.onReadScriptChanged(this.formGroup.value.scaleReadFunction);
            this.onWriteScriptChanged(this.formGroup.value.scaleWriteFunction);
        }

        this.formGroup.controls.scaleMode.valueChanges.subscribe(value => {
            this.onCheckScaleMode(value);
        });
    }
    ngOnDestroy() {
        try {
            if (this.subscriptionLoad) {
                this.subscriptionLoad.unsubscribe();
            }
        } catch (e) {
        }
    }
    onCheckScaleMode(value: string) {
        switch (value) {
            case 'linear':
                this.formGroup.controls.rawLow.setValidators(Validators.required);
                this.formGroup.controls.rawHigh.setValidators(Validators.required);
                this.formGroup.controls.scaledLow.setValidators(Validators.required);
                this.formGroup.controls.scaledHigh.setValidators(Validators.required);
                break;
            default:
                this.formGroup.controls.rawLow.clearValidators();
                this.formGroup.controls.rawHigh.clearValidators();
                this.formGroup.controls.scaledLow.clearValidators();
                this.formGroup.controls.scaledHigh.clearValidators();
                break;
        }
        this.formGroup.controls.rawLow.updateValueAndValidity();
        this.formGroup.controls.rawHigh.updateValueAndValidity();
        this.formGroup.controls.scaledLow.updateValueAndValidity();
        this.formGroup.controls.scaledHigh.updateValueAndValidity();
        this.formGroup.updateValueAndValidity();
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onOkClick(): void {
        let readParamsStr;
        if (this.configedReadParams[this.formGroup.value.scaleReadFunction]) {
            readParamsStr = JSON.stringify(this.configedReadParams[this.formGroup.value.scaleReadFunction]);
        } else {
            readParamsStr = undefined;
        }

        // const readParams = [];
        // for (const p of this.scaleReadParams.controls) {
        //     if (p.value.scriptId === this.formGroup.value.scaleReadFunction) {
        //         const param: ScriptParam = new ScriptParam(p.get('name').value, ScriptParamType.value);
        //         readParams.push(param);
        //     }
        // }
        // const readParamsStr = readParams.length > 0 ? JSON.stringify(readParams) : undefined;
        let writeParamsStr;
        if (this.configedWriteParams[this.formGroup.value.scaleWriteFunction]) {
            writeParamsStr = JSON.stringify(this.configedWriteParams[this.formGroup.value.scaleWriteFunction]);
        } else {
            writeParamsStr = undefined;
        }
        this.dialogRef.close({
            daq: new TagDaq(
                this.formGroup.value.enabled,
                this.formGroup.value.changed,
                this.formGroup.value.interval,
                this.formGroup.value.restored,
            ),
            format: this.formGroup.value.format,
            scale: (this.formGroup.value.scaleMode !== 'undefined') ? {
                mode: this.formGroup.value.scaleMode,
                rawLow: this.formGroup.value.rawLow,
                rawHigh: this.formGroup.value.rawHigh,
                scaledLow: this.formGroup.value.scaledLow,
                scaledHigh: this.formGroup.value.scaledHigh,
                dateTimeFormat: this.formGroup.value.dateTimeFormat
            } : null,
            scaleReadFunction: this.formGroup.value.scaleReadFunction,
            scaleReadParams: readParamsStr,
            scaleWriteFunction: this.formGroup.value.scaleWriteFunction,
            scaleWriteParams: writeParamsStr,
        });
    }

    disableForm() {
        return this.formGroup.invalid || this.paramsInValid();
    }
    paramsInValid() {
        if (this.formGroup.value.scaleReadFunction) {
            for (const p of this.configedReadParams[this.formGroup.value.scaleReadFunction]) {
                if (!p.value) {
                    return true;
                }
            }
        }
        if (this.formGroup.value.scaleWriteFunction) {
            for (const p of this.configedWriteParams[this.formGroup.value.scaleWriteFunction]) {
                if (!p.value) {
                    return true;
                }
            }
        }
        return false;
    }
    onReadScriptChanged(scriptId) {
        console.log(`Selected script ${scriptId}`);
       // this.enablePramsArray(this.scaleReadParams, scriptId);
        // if (scriptId) {
        //     this.formGroup.controls.scaleReadParams.setValidators(jsonValidator);
        //     this.selectedReadScript = this.scripts.find(s => s.id === scriptId);
        // } else {
        //     this.formGroup.controls.scaleReadParams.clearValidators();
        //     this.selectedReadScript = undefined;
        // }
        this.formGroup.updateValueAndValidity();
    }
    onWriteScriptChanged(scriptId) {
        console.log(`Selected script            ${scriptId}`);
        if (scriptId) {
            this.formGroup.controls.scaleWriteParams.setValidators(jsonValidator);
            this.selectedWriteScript = this.scripts.find(s => s.id === scriptId);
        } else {
            this.formGroup.controls.scaleWriteParams.clearValidators();
            this.selectedWriteScript = undefined;
        }
        this.formGroup.updateValueAndValidity();
    }

    // get readScripts() {
    //     return this.formGroup.get('scaleRead') as FormArray;
    // }

    // getReadParametersFormArray(scriptIndex: number) {
    //     return this.readScripts.controls[scriptIndex].get('parameters') as FormArray;
    //   }

    //   getReadParameterControls(scriptIndex: number) {
    //     return this.getReadParametersFormArray(scriptIndex).controls;
    //   }

    //   addReadScript(script: Script) {
    //     this.readScripts.push(this.getScriptItem(script.name, script.id));
    //   }
    //   addReadParameter(scriptIndex: number, name: string, value: any) {
    //     this.getReadParametersFormArray(scriptIndex).push(this.getParameterItem(name, value));
    //   }
    //   private addScriptFC(scriptsFCA: FormArray, script: Script) {
    //     scriptsFCA.push(this.getParameterItem())

    //   }
    // private initScripsFC(name: string, defaultScriptParams: {[key: string]: ScriptAndParam[]}): FormGroup {
    //     const fb = this.fb.group({
    //       name: name,
    //       scripts: this.fb.array([])
    //     });
    //     const fbsArray = fb.get('scripts') as FormArray;
    //     for (const script of this.scripts) {
    //         //this.addScriptFC(fb.get('scripts') as FormArray, script);
    //         const sfg = this.getScriptItem(script.name, script.id);
    //         const sfgPArray = sfg.get('parameters') as FormArray;
    //         for (const p of defaultScriptParams[script.id]) {
    //             const pfg = this.getParameterItem(p.name, p.value);
    //             sfgPArray.push(pfg);
    //         }
    //         fbsArray.push(sfg);
    //     }
    //     return fb;
    // }
    // private getScriptItem(name: string, id: string) {
    //     return this.fb.group({
    //       name: name,
    //       id: id,
    //       parameters: this.fb.array([])
    //     });
    //   }

    //   private getParameterItem(name: string = undefined, value: any = undefined) {
    //     return this.fb.group({
    //       name: name,
    //       value:[value, Validators.required]
    //     });
    //   }
    private loadScripts() {
        //scripts that can be used to scale a tag must have the first parameter named "value" of
        // type value and be
        //run on the server
        //if additional parameters are used they must be of type value and the value to pass
        //must be provided in this form /////
        const filteredScripts = this.projectService.getScripts().filter(script => {
            if (script.parameters.length > 0 && script.mode === ScriptMode.SERVER) {
                if (script.parameters[0].name !== 'value' || script.parameters[0].type !== ScriptParamType.value) {
                    return false;
                }
                for (const param of script.parameters) {
                    if (param.type !== ScriptParamType.value) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        });
        // get default param/value list for each script
        for (const script of filteredScripts) {
            const paramCopy = [];
            //skip the first param, as it is the value to scale
            for (let i = 1; i < script.parameters.length; i++ ) {
                const pc = new ScriptAndParam(script.parameters[i].name, script.parameters[i].type);
                pc.scriptId = script.id;
                pc.value = ('value' in script.parameters[i]) ? script.parameters[i].value : null;
                paramCopy.push(pc);
           }
           this.configedReadParams[script.id] = paramCopy;
           this.configedWriteParams[script.id] = paramCopy;
        }
        this.scripts = filteredScripts;
	}
    // get scaleReadParams() {
    //     return this.formGroup.get('scaleReadParams') as FormArray;
    // }
    // private addReadParam(scriptId: string, name: string, value: any) {
    //     const param = this.fb.group( {
    //         scriptId: [scriptId],
    //         name: [name],
    //         value: [value,[Validators.required]]
    //     });
    //     this.scaleReadParams.push(param);
    // }
    // private addParamToFormArray(paramsArray: FormArray, scriptId: string, name: string, value: any) {
    //     const param = this.fb.group( {
    //         scriptId: [scriptId],
    //         name: [name],
    //         value: [value,[Validators.required]]
    //     });
    //     paramsArray.push(param);
    // }
    // private enablePramsArray(paramsArray: FormArray, scriptId: string) {
    //     for (const fcParam of paramsArray.controls) {
    //         if (fcParam.value.scriptId === scriptId) {
    //             fcParam.enable;
    //         } else {
    //             fcParam.disable;
    //         }
    //     }
    // }
    // private enableParamsForSelectedScripts(allParamsForAllScripts: FormArray) {
    //     this.enablePramsArray(allParamsForAllScripts, this.formGroup.value.scaleReadFunction);
    // }
    // private loadParamsFormArray(defaultScriptParams: {[key: string]: ScriptAndParam[]}, paramsArray: FormArray) {
    //     //defaultScriptParams now updated with passed in values, build formarray from this
    //     for (const key in defaultScriptParams) {
    //         const sp = defaultScriptParams[key];
    //         for (const p of sp) {
    //             this.addParamToFormArray(paramsArray, p.scriptId, p.name, p.value);
    //         }
    //     }
    // }
    /**
     * updates this.configedParams list with the previously saved list of param/values for
     * the script.
     * @param script
     * @param tagParams
     * @returns returns true if the param/value list no longer matches script param/value list,
     * in which case the this.configedParams is not updated (default list will be used)
     */
    private initializeScriptParams(script: Script, tagParams: ScriptParam[], toUpdate: {[key: string]: ScriptParam[]}) {
        if (script) {
            // verify current params list match script params/values list
            let parametersChanged = false;
            if (tagParams.length !== script.parameters.length - 1) {
                parametersChanged = true;
            } else {
                for (const [index, param] of script.parameters.entries()) {
                    if (index === 0) {
                        continue;// skip first param as it is for the tag value
                    }
                    if (!(tagParams.some(p => p.name === param.name))) {
                        parametersChanged = true;
                        break;
                    }
                }
            }
            if (parametersChanged) {
                return true;
            } else {
                // haven't changed, update the working list with the previously saved
                // param/values
                toUpdate[script.id] = tagParams;
                return false;
            }
        }
        return true;
    }
}

export interface ITagOption {
    daq: TagDaq;
    format: number;
    scale: TagScale;
    scaleReadFunction: string;
    scaleReadParams: string;
    scaleWriteFunction: string;
    scaleWriteParams: string;
}
