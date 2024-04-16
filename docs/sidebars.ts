import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import { DOC_FOLDER, packageMap } from './utils/packageMap';

const items = Object.values(packageMap).map((config) => ({
  type: 'category',
  label: config.name,
  link: {
    type: 'doc',
    id: `${config.dirName}/index`
  },
  items: require(`./${DOC_FOLDER}/${config.dirName}/typedoc-sidebar.cjs`)
})) as unknown as SidebarsConfig;

const sidebars: SidebarsConfig = {
  docsSidebar: [items]
};

export default sidebars;
