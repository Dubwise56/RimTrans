import * as io from '@rimtrans/io';
import * as definition from './definition';
import * as typePackage from './type-package';
import * as injection from './injection';
import { Mod, FOLDER_NAME_LANGUAGES, FOLDER_NAME_DEF_INJECTED } from './mod';

export interface ExtractorSolution {
  typePackages: string[];
  modPaths: string[];
  enabledMods: boolean[];
  languages: string[];
  outputDirectory: string;
  injectionSerializeConfig?: injection.InjectionSerializeConfig;
}

/**
 *
 * @param paths the array of paths to mod directories, order: `[core, ...mods]`.
 */
export async function extract(solution: ExtractorSolution): Promise<Mod[]> {
  const {
    typePackages,
    modPaths,
    enabledMods,
    languages,
    outputDirectory,
    injectionSerializeConfig,
  } = solution;

  const mods = await Promise.all(modPaths.map(path => Mod.load(path)));

  const [definitionMaps, classInfoMap, languagesToOldInjectionMaps] = await Promise.all([
    definition.load(mods.map(mod => mod.pathDefs)).then(definition.resolveInheritance),
    typePackage.load([...typePackages, ...mods.map(mod => mod.pathAssemblies)]),
    Promise.all(
      languages.map(lang => injection.load(mods.map(mod => mod.pathDefInjected(lang)))),
    ),
  ]);

  const newInjectionMaps = injection.parse(definitionMaps, classInfoMap);

  await Promise.all(
    languages.map(async (lang, langIndex) => {
      const oldInjectionMaps = languagesToOldInjectionMaps[langIndex];
      const mergedInjectionMaps = mods.map((mod, modIndex) =>
        injection.merge(newInjectionMaps[modIndex], oldInjectionMaps[modIndex]),
      );
      injection.checkDuplicated(mergedInjectionMaps);
      const serializedInjectionMaps = injection.serialize(
        mergedInjectionMaps,
        injectionSerializeConfig,
      );

      await Promise.all(
        mods.map(async (mod, modIndex) => {
          if (!enabledMods[modIndex]) {
            return;
          }
          await injection.save(
            io.join(
              outputDirectory,
              mod.identify,
              FOLDER_NAME_LANGUAGES,
              lang,
              FOLDER_NAME_DEF_INJECTED,
            ),
            serializedInjectionMaps[modIndex],
          );
        }),
      );
    }),
  );

  return mods;
}