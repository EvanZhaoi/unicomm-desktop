export type Language = "zh-CN" | "ja-JP";

export const DEFAULT_LANGUAGE: Language = "zh-CN";

const languageAliases: Array<[RegExp, Language]> = [
  [/^zh($|-hans|-cn|-sg)/, "zh-CN"],
  [/^ja($|-jp)/, "ja-JP"],
];

const messages = {
  "zh-CN": {
    "app.initializing": "初始化中...",
    "auth.checking": "正在识别当前 Windows 用户...",
    "auth.rejected.title": "当前 Windows 用户未授权",
    "auth.rejected.description": "请联系系统管理员获取权限",
    "auth.offline.title": "无法连接认证服务",
    "auth.offline.description": "请检查网络连接后重试",
    "auth.failed": "认证失败",
    "nav.memo": "备忘录",
    "nav.settings": "设置",
    "nav.workspace": "工作空间",
    "nav.ready": "已就绪",
    "nav.shortcuts": "快捷入口",
    "nav.status": "状态",
    "settings.language.title": "语言与字体",
    "settings.language.label": "界面语言",
    "settings.language.zh": "中文",
    "settings.language.ja": "日本語",
    "settings.language.font": "字体",
    "settings.language.fontName": "阿里巴巴普惠体 3.0",
    "settings.language.fontHint": "字体文件已随桌面端打包",
    "settings.language.saved": "语言设置已更新",
    "settings.shortcuts.title": "快捷键",
    "settings.shortcuts.showMain": "唤出主界面",
    "settings.shortcuts.showMainHint": "打开 UniComm 主窗口",
    "settings.shortcuts.quickMemo": "唤出简易 Memo",
    "settings.shortcuts.quickMemoHint": "打开快速 Memo 编辑器",
    "settings.shortcuts.empty": "快捷键不能为空",
    "settings.shortcuts.duplicate": "两个快捷键不能相同",
    "settings.shortcuts.saved": "快捷键已更新",
    "settings.shortcuts.failed": "快捷键更新失败",
    "settings.actions.reset": "恢复默认",
    "settings.actions.save": "保存",
    "memo.title": "备忘录",
    "memo.groups": "分组",
    "memo.count": "{count} 条",
    "memo.editor.edit": "编辑",
    "memo.editor.preview": "预览",
    "memo.editor.visual": "可视化",
    "memo.editor.markdown": "MD 源码",
    "memo.editor.saved": "已保存",
    "memo.new": "新建 Memo",
    "memo.all": "全部",
    "memo.search.placeholder": "搜索标题或内容",
    "memo.search": "搜索",
    "memo.loading": "加载中...",
    "memo.empty": "暂无备忘录",
    "memo.noContent": "无内容",
    "memo.pinned": "置顶",
    "memo.action.pin": "置顶",
    "memo.action.favorite": "收藏",
    "memo.action.archive": "归档",
    "memo.action.delete": "删除",
    "memo.action.save": "保存",
    "memo.title.placeholder": "无标题",
    "memo.status.normal": "普通",
    "memo.status.todo": "待办",
    "memo.status.done": "完成",
    "memo.updatedAt": "更新于 {time}",
    "memo.editor.placeholder": "输入 Markdown 内容...",
    "memo.selectOrCreate": "选择或新建一条备忘录",
    "memo.errors.load": "加载备忘录失败",
    "memo.errors.create": "创建备忘录失败",
    "memo.errors.save": "保存备忘录失败",
    "memo.errors.delete": "删除备忘录失败",
    "quickMemo.title": "快速 Memo",
    "quickMemo.close": "关闭",
    "quickMemo.placeholder": "输入内容，保存后新增一条 Memo",
    "quickMemo.create": "新增",
    "quickMemo.error.create": "新增 Memo 失败",
  },
  "ja-JP": {
    "app.initializing": "初期化中...",
    "auth.checking": "現在の Windows ユーザーを識別しています...",
    "auth.rejected.title": "現在の Windows ユーザーは許可されていません",
    "auth.rejected.description": "権限についてはシステム管理者に連絡してください",
    "auth.offline.title": "認証サービスに接続できません",
    "auth.offline.description": "ネットワーク接続を確認してから再試行してください",
    "auth.failed": "認証に失敗しました",
    "nav.memo": "メモ",
    "nav.settings": "設定",
    "nav.workspace": "ワークスペース",
    "nav.ready": "準備完了",
    "nav.shortcuts": "ショートカット",
    "nav.status": "ステータス",
    "settings.language.title": "言語とフォント",
    "settings.language.label": "表示言語",
    "settings.language.zh": "中文",
    "settings.language.ja": "日本語",
    "settings.language.font": "フォント",
    "settings.language.fontName": "Alibaba PuHuiTi 3.0",
    "settings.language.fontHint": "フォントファイルはデスクトップ版に同梱されています",
    "settings.language.saved": "言語設定を更新しました",
    "settings.shortcuts.title": "ショートカット",
    "settings.shortcuts.showMain": "メイン画面を表示",
    "settings.shortcuts.showMainHint": "UniComm メインウィンドウを開く",
    "settings.shortcuts.quickMemo": "クイックメモを表示",
    "settings.shortcuts.quickMemoHint": "クイックメモエディターを開く",
    "settings.shortcuts.empty": "ショートカットは空にできません",
    "settings.shortcuts.duplicate": "2つのショートカットは同じにできません",
    "settings.shortcuts.saved": "ショートカットを更新しました",
    "settings.shortcuts.failed": "ショートカットの更新に失敗しました",
    "settings.actions.reset": "デフォルトに戻す",
    "settings.actions.save": "保存",
    "memo.title": "メモ",
    "memo.groups": "グループ",
    "memo.count": "{count} 件",
    "memo.editor.edit": "編集",
    "memo.editor.preview": "プレビュー",
    "memo.editor.visual": "ビジュアル",
    "memo.editor.markdown": "MD ソース",
    "memo.editor.saved": "保存済み",
    "memo.new": "新規メモ",
    "memo.all": "すべて",
    "memo.search.placeholder": "タイトルまたは内容を検索",
    "memo.search": "検索",
    "memo.loading": "読み込み中...",
    "memo.empty": "メモはありません",
    "memo.noContent": "内容なし",
    "memo.pinned": "固定",
    "memo.action.pin": "固定",
    "memo.action.favorite": "お気に入り",
    "memo.action.archive": "アーカイブ",
    "memo.action.delete": "削除",
    "memo.action.save": "保存",
    "memo.title.placeholder": "無題",
    "memo.status.normal": "通常",
    "memo.status.todo": "未対応",
    "memo.status.done": "完了",
    "memo.updatedAt": "{time} 更新",
    "memo.editor.placeholder": "Markdown 内容を入力...",
    "memo.selectOrCreate": "メモを選択または新規作成してください",
    "memo.errors.load": "メモの読み込みに失敗しました",
    "memo.errors.create": "メモの作成に失敗しました",
    "memo.errors.save": "メモの保存に失敗しました",
    "memo.errors.delete": "メモの削除に失敗しました",
    "quickMemo.title": "クイックメモ",
    "quickMemo.close": "閉じる",
    "quickMemo.placeholder": "内容を入力すると、新しいメモとして保存されます",
    "quickMemo.create": "追加",
    "quickMemo.error.create": "メモの追加に失敗しました",
  },
} as const;

export type MessageKey = keyof (typeof messages)["zh-CN"];

export function translate(
  key: MessageKey,
  language: Language,
  values?: Record<string, string | number>
): string {
  const template: string = messages[language][key] ?? messages["zh-CN"][key] ?? key;
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (result, [name, value]) => result.split(`{${name}}`).join(String(value)),
    template
  );
}

export function isSupportedLanguage(value: string): value is Language {
  return value === "zh-CN" || value === "ja-JP";
}

export function resolveSupportedLanguage(locale: string | null | undefined): Language | null {
  if (!locale) {
    return null;
  }

  const normalized = locale.trim().toLowerCase().replace(/_/g, "-");
  const match = languageAliases.find(([pattern]) => pattern.test(normalized));
  return match?.[1] ?? null;
}

function getSystemLocales(): string[] {
  if (typeof navigator === "undefined") {
    return [];
  }

  const locales = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(locales));
}

export function detectDefaultLanguage(locales = getSystemLocales()): Language {
  for (const locale of locales) {
    const language = resolveSupportedLanguage(locale);
    if (language) {
      return language;
    }
  }

  return DEFAULT_LANGUAGE;
}
