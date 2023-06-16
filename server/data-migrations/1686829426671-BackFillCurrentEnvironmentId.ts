import { App } from 'src/entities/app.entity';
import { AppVersion } from 'src/entities/app_version.entity';
import { Organization } from 'src/entities/organization.entity';
import { EntityManager, MigrationInterface, QueryRunner } from 'typeorm';

export class BackFillCurrentEnvironmentId1686829426671 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    //back fill current_environment_id to production env id
    await this.backFillNewColumn(queryRunner.manager);
  }

  async backFillNewColumn(manager: EntityManager) {
    const organizations = await manager.find(Organization, {
      select: ['id', 'appEnvironments'],
      relations: ['appEnvironments'],
    });

    for (const organization of organizations) {
      const productionEnvironment = organization.appEnvironments.find((appEnvironment) => appEnvironment.isDefault);
      const apps = await manager.find(App, {
        select: ['id', 'appVersions'],
        relations: ['appVersions'],
      });
      for (const { appVersions } of apps) {
        for (const appVersion of appVersions) {
          console.log('Updating app version =>', appVersion.id);
          manager.update(
            AppVersion,
            { id: appVersion.id },
            {
              currentEnvironmentId: productionEnvironment.id,
            }
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}