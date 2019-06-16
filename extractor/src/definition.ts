import pth from 'path';
import * as io from '@rimtrans/io';
import * as xml from './xml';

xml.mountDomPrototype();

export interface DefDocumentMap {
  [path: string]: XMLDocument;
}

// ----------------------------------------------------------------
// Loading

/**
 * Load all Defs file from a directory and get array of `DefDocumentMap`.
 * @param paths the array of paths to Def directories, order: `[core, ...mods]`.
 */
export async function load(paths: string[]): Promise<DefDocumentMap[]> {
  return Promise.all(
    paths.map(async path => {
      const map: Record<string, XMLDocument> = {};
      if (!(await io.directoryExists(path))) {
        return map;
      }

      await io
        .search(['**/*.xml'], {
          cwd: path,
          case: false,
          onlyFiles: true,
        })
        .then(files =>
          Promise.all(
            files.map(async file => {
              map[file] = await xml.load(pth.join(path, file));
            }),
          ),
        );
      return map;
    }),
  );
}

// ----------------------------------------------------------------
// Inheritance
// RimWorld Assembly-CSharp.dll Verse/XmlInheritance.cs

const ATTRIBUTE_NAME_NAME = 'Name';
const ATTRIBUTE_NAME_PARENT_NAME = 'ParentName';
const ATTRIBUTE_NAME_INHERIT = 'Inherit';

interface InheritanceNode {
  def: Element;
  resolvedDef?: Element;
  parent?: InheritanceNode;
  children: InheritanceNode[];
}

/**
 * Resolve the Defs inheritance.
 * @param maps the array of `DefDocumentMap`, order: `[core, ...mods]`.
 */
export function resolveInheritance(maps: DefDocumentMap[]): DefDocumentMap[] {
  if (maps.length < 1) {
    throw new Error(`The argument 'maps' is a empty array.`);
  }

  const allNodes: InheritanceNode[] = [];
  const parentMaps: Record<string, Record<string, InheritanceNode>>[] = [];

  // register
  maps.forEach(map => {
    const parentMap: Record<string, Record<string, InheritanceNode>> = {};
    Object.keys(map)
      .sort()
      .forEach(path => {
        const {
          documentElement: { children: defs },
        } = map[path];
        Array.from(defs).forEach(def => {
          const node: InheritanceNode = {
            def,
            children: [],
          };
          allNodes.push(node);
          const name = def.getAttribute(ATTRIBUTE_NAME_NAME);
          const subMap = parentMap[def.tagName] || (parentMap[def.tagName] = {});
          if (name) {
            subMap[name] = node;
          }
        });
      });
    parentMaps.push(parentMap);
  });

  // Reverse parent map
  parentMaps.reverse();

  const getParent = (
    node: InheritanceNode,
    parentName: string,
  ): InheritanceNode | undefined => {
    const defType = node.def.tagName;
    // eslint-disable-next-line no-restricted-syntax
    for (const parentMap of parentMaps) {
      const parent = parentMap[defType] && parentMap[defType][parentName];
      if (parent) {
        return parent;
      }
    }
    return undefined;
  };

  // link parents and children
  allNodes.forEach(node => {
    const parentNameAttribute = node.def.attributes.getNamedItem(
      ATTRIBUTE_NAME_PARENT_NAME,
    );
    if (parentNameAttribute && parentNameAttribute.value) {
      node.parent = getParent(node, parentNameAttribute.value);
      if (node.parent) {
        node.parent.children.push(node);
      } else {
        // TODO parent not found
      }
    }
  });

  // resolve
  allNodes
    .filter(node => !node.parent)
    .forEach(node => resolveInheritanceNodeRecursively(node));

  allNodes.forEach(node => {
    if (node.def !== node.resolvedDef) {
      node.def.replaceWith(node.resolvedDef as Element);
    }
  });

  return maps;
}

export function resolveInheritanceNodeRecursively(node: InheritanceNode): void {
  if (node.resolvedDef) {
    throw new Error('Resolve cyclic inheritance node.');
  }
  resolveXmlNodeFor(node);
  node.children.forEach(resolveInheritanceNodeRecursively);
}

export function resolveXmlNodeFor(node: InheritanceNode): void {
  if (!node.parent) {
    node.resolvedDef = node.def;
    return;
  }
  if (!node.parent.resolvedDef) {
    throw new Error(
      'Tried to resolve node whose parent has not been resolved yet. This means that this method was called in incorrect order.',
    );
  }
  const current =
    node.def.ownerDocument === node.parent.resolvedDef.ownerDocument
      ? (node.parent.resolvedDef.cloneNode(true) as Element)
      : (node.def.ownerDocument as Document).importNode(node.parent.resolvedDef, true);
  recursiveNodeCopyOverwriteElements(node.def, current);
  node.resolvedDef = current;
}

export function recursiveNodeCopyOverwriteElements(
  child: Element,
  current: Element,
): void {
  const inherit = child.getAttribute(ATTRIBUTE_NAME_INHERIT);
  if (inherit && inherit.toLowerCase() === 'false') {
    current.removeAllChildNodes();
    current.appendChildrenClone(child.childNodes);
  } else {
    current.removeAllAttributes();
    Array.from(child.attributes).forEach(attr =>
      current.setAttribute(attr.name, attr.value),
    );

    const childValue = child.elementValue.trim();

    if (childValue) {
      current.elementValue = childValue;
    } else if (child.children.length === 0) {
      if (current.children.length > 0) {
        current.removeAllChildNodes();
      }
    } else {
      child.getElements().forEach(elChild => {
        if (elChild.tagName === 'li') {
          current.appendChildClone(elChild);
        } else {
          const elCurrent = current.getElement(elChild.tagName);
          if (elCurrent) {
            recursiveNodeCopyOverwriteElements(elChild, elCurrent);
          } else {
            current.appendChildClone(elChild);
          }
        }
      });
    }
  }
}