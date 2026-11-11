import {Module} from "@nestjs/common";
import {AuthModule} from "../auth/auth.module.js";
import {BusinessSettingsController} from "./business-settings.controller.js";
import {BusinessSettingsService} from "./business-settings.service.js";
@Module({imports:[AuthModule],controllers:[BusinessSettingsController],providers:[BusinessSettingsService]})
export class BusinessSettingsModule{}
