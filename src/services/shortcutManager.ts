import { Platform } from 'react-native';

export interface ShortcutAction {
  type: 'add';
}

/**
 * 快捷方式管理器（静态配置）
 *
 * 快捷方式通过 AndroidManifest.xml 和 shortcuts.xml 静态配置
 * 无需动态设置，无需第三方库
 */
class ShortcutManagerClass {
  /**
   * 快捷方式通过静态配置设置
   * 此方法仅为兼容性保留
   */
  async setupShortcuts(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('快捷方式仅支持 Android 平台');
      return;
    }

    // 静态快捷方式已在 shortcuts.xml 中配置
    // 无需动态设置
    console.log('使用静态快捷方式配置（shortcuts.xml）');
  }

  /**
   * 处理快捷方式点击
   */
  handleShortcut(data: string): ShortcutAction | null {
    if (!data) {
      return null;
    }

    // 静态快捷方式通过 Intent data 传递
    try {
      if (data === 'add') {
        return { type: data } as ShortcutAction;
      }
    } catch (error) {
      console.error('解析快捷方式数据失败:', error);
    }

    return null;
  }
}

export const shortcutManager = new ShortcutManagerClass();
