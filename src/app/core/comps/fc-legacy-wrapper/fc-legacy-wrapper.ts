import { Component } from '@angular/core';
import { FileConverterLegacy } from "../file-converter-legacy/file-converter-legacy";

@Component({
  selector: 'rh-fc-legacy-wrapper',
  imports: [FileConverterLegacy],
  templateUrl: './fc-legacy-wrapper.html',
  styleUrl: './fc-legacy-wrapper.scss'
})
export class FcLegacyWrapper {

}
