import { Body, Delete, Post, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';
import { Controller } from '@tsoa/runtime';
import { In } from 'typeorm';
import { Request as ExpressRequest } from 'express';
import ModeManager from './mode-manager';
import SubscribeEntity from '../root/entities/subscribe-entity';
import { LightsGroup } from '../lights/entities';
import { Audio, Screen } from '../root/entities';
import CenturionMode from './centurion/centurion-mode';
import tapes from './centurion/tapes';
import dataSource from '../../database';
import { SecurityGroup } from '../../helpers/security';
import { HttpStatusCode } from '../../helpers/customError';
import TimeTrailRaceMode from './time-trail-race/time-trail-race-mode';
import logger from '../../logger';

interface EnableModeParams {
  lightsGroupIds: number[];
  screenIds: number[];
  audioIds: number[];
}

interface CenturionParams extends EnableModeParams {
  centurionName: string;
}

interface TimeTrailRaceParams extends EnableModeParams {
  sessionName: string;
}

@Route('modes')
@Tags('Modes')
export class ModeController extends Controller {
  private modeManager: ModeManager;

  constructor() {
    super();
    this.modeManager = ModeManager.getInstance();
  }

  private async findEntities(
    entity: typeof SubscribeEntity,
    ids: number[],
  ): Promise<SubscribeEntity[]> {
    return dataSource.getRepository(entity).find({ where: { id: In(ids) } });
  }

  private async mapBodyToEntities(params: EnableModeParams) {
    const lights = (await this.findEntities(LightsGroup, params.lightsGroupIds)) as LightsGroup[];
    const screens = (await this.findEntities(Screen, params.lightsGroupIds)) as Screen[];
    const audios = (await this.findEntities(Audio, params.lightsGroupIds)) as Audio[];

    return { lights, screens, audios };
  }

  /**
   * Disable all modes, if one is active
   */
  @Security('local', [
    SecurityGroup.ADMIN,
    SecurityGroup.AVICO,
    SecurityGroup.BAC,
    SecurityGroup.BOARD,
  ])
  @Delete('')
  @SuccessResponse(HttpStatusCode.Ok)
  public disableAllModes(@Request() req: ExpressRequest) {
    logger.audit(req.user, 'Disable all modes.');
    this.modeManager.reset();
  }

  /**
   * Enable Centurion mode for the given devices
   */
  @Security('local', [
    SecurityGroup.ADMIN,
    SecurityGroup.AVICO,
    SecurityGroup.BAC,
    SecurityGroup.BOARD,
  ])
  @Post('centurion')
  @SuccessResponse(HttpStatusCode.NoContent)
  public async enableCenturion(
    @Request() req: ExpressRequest,
    @Body() params: CenturionParams,
  ): Promise<string> {
    logger.audit(req.user, `Enable Centurion mode with tape "${params.centurionName}".`);

    const { lights, screens, audios } = await this.mapBodyToEntities(params);

    const centurionMode = new CenturionMode(lights, screens, audios);
    centurionMode.initialize(this.modeManager.musicEmitter);
    const tape = tapes.find((t) => t.name === params.centurionName);
    if (tape === undefined) {
      this.setStatus(404);
      return 'Centurion tape not found.';
    }
    centurionMode.loadTape(tape);
    this.modeManager.enableMode(CenturionMode, centurionMode, 'centurion');

    this.setStatus(204);
    return '';
  }

  @Security('local', [
    SecurityGroup.ADMIN,
    SecurityGroup.AVICO,
    SecurityGroup.BAC,
    SecurityGroup.BOARD,
  ])
  @Delete('centurion')
  @SuccessResponse(HttpStatusCode.Ok)
  public disableCenturion(@Request() req: ExpressRequest) {
    logger.audit(req.user, 'Disable Centurion mode.');
    this.modeManager.disableMode(CenturionMode, 'centurion');
  }

  /**
   * Enable Time Trail Race (spoelbakkenrace) mode for the given devices
   */
  @Security('local', [SecurityGroup.ADMIN, SecurityGroup.BAC, SecurityGroup.BOARD])
  @Post('time-trail-race')
  @SuccessResponse(HttpStatusCode.NoContent)
  public async enableTimeTrailRace(
    @Request() req: ExpressRequest,
    @Body() params: TimeTrailRaceParams,
  ): Promise<string> {
    logger.audit(req.user, `Enable Spoelbakkenrace mode for "${params.sessionName}".`);

    const { lights, screens, audios } = await this.mapBodyToEntities(params);

    const timeTrailRaceMode = new TimeTrailRaceMode(lights, screens, audios);
    timeTrailRaceMode.initialize(this.modeManager.backofficeSyncEmitter, params.sessionName);
    this.modeManager.enableMode(TimeTrailRaceMode, timeTrailRaceMode, 'time-trail-racing');

    this.setStatus(204);
    return '';
  }

  @Security('local', [SecurityGroup.ADMIN, SecurityGroup.BAC, SecurityGroup.BOARD])
  @Delete('time-trail-race')
  @SuccessResponse(HttpStatusCode.Ok)
  public disableTimeTrailRacing(@Request() req: ExpressRequest) {
    logger.audit(req.user, 'Disable Spoelbakkenrace mode.');
    this.modeManager.disableMode(TimeTrailRaceMode, 'time-trail-racing');
  }
}
