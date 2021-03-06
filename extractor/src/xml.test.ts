import pth from 'path';
import fse from 'fs-extra';
import globby from 'globby';

import { pathCore, pathTestMods, resolvePath, TEMP } from './utils.test';

import {
  loadXML,
  parseXML,
  defaultXmlPrettierOptions,
  resolveXmlPrettierOptions,
  saveXML,
} from './xml';

describe('xml', () => {
  test('load', async () => {
    const ids = await globby(['*'], { cwd: pathTestMods, onlyDirectories: true });
    await Promise.all(
      ids.slice(0, 10).map(async id => {
        const pathDefs = pth.join(pathTestMods, id, 'Defs');
        if (await fse.pathExists(pathDefs)) {
          const defFiles = await globby(['**/*.xml'], {
            cwd: pathDefs,
            caseSensitiveMatch: false,
            onlyFiles: true,
          });
          Promise.all(
            defFiles.map(async file => {
              const root = await loadXML(pth.join(pathDefs, file));
              expect(root.nodeType).toBe('element');
            }),
          );
        }
      }),
    );
  });

  test('parse', () => {
    const rootData = parseXML(`
    <Defs>
      <!---->
      <MockDef Name="MockBase"><defName>Mock_0</defName></MockDef>
      <MockDef ParentName="MockBase">
        <defName>Mock_1</defName>
      </MockDef>
      <MockDef disabled="">
        <defName></defName>
      </MockDef>
      <![CDATA[]]>
    </Defs>
    `);
    expect(rootData.childNodes.length).toBe(10);
    expect(rootData.elements.length).toBe(3);
    expect(rootData.elements[0].attributes.Name).toBe('MockBase');
    expect(rootData.elements[0].childNodes.length).toBe(1);
    expect(rootData.elements[1].attributes.ParentName).toBe('MockBase');
    expect(rootData.elements[1].childNodes.length).toBe(3);
  });

  test('prettier options', () => {
    {
      const { resolvedOptions } = resolveXmlPrettierOptions();
      expect(resolvedOptions).toEqual(defaultXmlPrettierOptions());
    }
    {
      const { tab, indent, eol, newline } = resolveXmlPrettierOptions();
      expect(tab).toBe('  ');
      expect(indent.value).toBe('  ');
      expect(eol).toBe('\n');
      expect(newline.value).toBe('\n');
    }
    {
      const { tab, indent } = resolveXmlPrettierOptions({
        tabWidth: 3,
      });
      expect(tab).toBe('   ');
      expect(indent.value).toBe('   ');
    }
    {
      const { tab, indent } = resolveXmlPrettierOptions({
        tabWidth: 4,
      });
      expect(tab).toBe('    ');
      expect(indent.value).toBe('    ');
    }
    {
      const { tab, indent } = resolveXmlPrettierOptions({
        tabWidth: 4,
        useTabs: true,
      });
      expect(tab).toBe('\t');
      expect(indent.value).toBe('\t');
    }
    {
      const { eol, newline } = resolveXmlPrettierOptions({
        endOfLine: 'cr',
      });
      expect(eol).toBe('\r');
      expect(newline.value).toBe('\r');
    }
    {
      const { eol, newline } = resolveXmlPrettierOptions({
        endOfLine: 'crlf',
      });
      expect(eol).toBe('\r\n');
      expect(newline.value).toBe('\r\n');
    }
    {
      const { eol, newline } = resolveXmlPrettierOptions({
        endOfLine: 'lf',
      });
      expect(eol).toBe('\n');
      expect(newline.value).toBe('\n');
    }
  });

  test('save', async () => {
    const rootData = parseXML(`
    <Defs>
    <!---->
      <MockDef Name="MockBase"><defName>Mock_0</defName></MockDef>
      <MockDef ParentName="MockBase">
        <defName>Mock_1</defName>
      </MockDef>
      <MockDef disabled="">
        <defName></defName>
      </MockDef>
    </Defs>
    `);

    await Promise.all([
      saveXML(resolvePath(TEMP, 'xml', '0.xml'), rootData, false),
      saveXML(resolvePath(TEMP, 'xml', '1.xml'), rootData, true),
      saveXML(resolvePath(TEMP, 'xml', '2.xml'), rootData, true, {
        printWidth: 120,
      }),
      saveXML(resolvePath(TEMP, 'xml', '3.xml'), rootData, true, {
        tabWidth: 4,
        endOfLine: 'cr',
      }),
      saveXML(resolvePath(TEMP, 'xml', '4.xml'), rootData, true, {
        useTabs: true,
        endOfLine: 'crlf',
      }),
    ]);
  });
});
