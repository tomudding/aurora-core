import { Repository } from 'typeorm';
import { Audio } from './entities';
import dataSource from '../../database';
import AuthService from '../auth/auth-service';

export interface AudioResponse extends Pick<Audio, 'id' | 'createdAt' | 'updatedAt' | 'name'> {}

export interface AudioCreateParams extends Pick<Audio, 'name'> {}

export default class RootAudioService {
  private repository: Repository<Audio>;

  constructor() {
    this.repository = dataSource.getRepository(Audio);
  }

  public static toAudioResponse(audio: Audio): AudioResponse {
    return {
      id: audio.id,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      name: audio.name,
    };
  }

  public async getAllAudios(): Promise<Audio[]> {
    return this.repository.find();
  }

  public async getSingleAudio(id: number): Promise<Audio | null> {
    return this.repository.findOne({ where: { id } });
  }

  public async createAudio(params: AudioCreateParams): Promise<Audio> {
    const audio = await this.repository.save({
      name: params.name,
    });
    await new AuthService().createApiKey({ audio });
    return audio;
  }
}
