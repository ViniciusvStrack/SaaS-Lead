import {Module} from "@nestjs/common";
import {BusinessSettingsController} from "./business-settings.controller.js";
import {BusinessSettingsService} from "./business-settings.service.js";
@Module({controllers:[BusinessSettingsController],providers:[BusinessSettingsService]})
export class BusinessSettingsModule{}
