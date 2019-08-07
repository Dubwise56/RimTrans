import * as io from '@rimtrans/io';
import {
  FOLDER_NAME_ABOUT,
  FILE_NAME_ABOUT,
  Mod,
  ModMetaData,
} from '@rimtrans/extractor';
import { createSlaverSub } from '../../utils/slaver';

export interface ModMetaDataSlaver {
  request: [
    {
      genre: 'directories' | 'files';
      paths: string[];
    },
    Record<string, ModMetaData>
  ];
}

function setup(): void {
  const slaver = createSlaverSub<ModMetaDataSlaver>();

  slaver.addListener('request', async ({ genre, paths }) => {
    const mods: Record<string, ModMetaData> = {};

    if (genre === 'directories') {
      await Promise.all(
        paths.map(async dir => {
          const files = await io.search([`*/${FOLDER_NAME_ABOUT}/${FILE_NAME_ABOUT}`], {
            cwd: dir,
            onlyFiles: true,
            caseSensitiveMatch: false,
          });

          await Promise.all(
            files.map(f => {
              const p = io.join(dir, f.split(/\\|\//)[0]);
              return Mod.load(p).then(mod => {
                mods[p] = mod.meta;
              });
            }),
          );
        }),
      );
    } else {
      await Promise.all(
        paths.map(p =>
          Mod.load(p).then(mod => {
            mods[p] = mod.meta;
          }),
        ),
      );
    }

    slaver.send('request', mods);
  });
}

setup();
