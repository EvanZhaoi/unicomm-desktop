/**
 * 备忘录类型定义
 * 
 * 定义备忘录（Memo）功能的数据结构和类型。
 * 
 * ## 数据模型
 * 
 * ### Memo
 * 备忘录的核心实体，包含：
 * - 基本信息：id、标题、内容
 * - 时间戳：createdAt、updatedAt
 * - 状态：isPinned（置顶）、isArchived（归档）
 * 
 * ### MemoListItem
 * 列表视图使用的精简数据结构，不包含完整 content 字段，
 * 用于列表展示以减少数据传输量。
 * 
 * ## 使用示例
 * ```typescript
 * import type { Memo, MemoCreateInput, MemoUpdateInput } from '@/features/memo/types';
 * 
 * // 创建备忘录
 * const newMemo: MemoCreateInput = {
 *   title: '会议纪要',
 *   content: '讨论了 Q4 目标...'
 * };
 * 
 * // 更新备忘录
 * const update: MemoUpdateInput = {
 *   id: 123,
 *   title: '更新后的标题'
 * };
 * ```
 * 
 * @module features/memo/types
 */

/**
 * 备忘录实体
 * 
 * 表示一条完整的备忘录记录。
 */
export interface Memo {
  /** 备忘录唯一 ID */
  id: number;
  /** 备忘录标题 */
  title: string;
  /** 备忘录正文内容（支持富文本/Markdown） */
  content: string;
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 是否置顶 */
  isPinned: boolean;
  /** 是否归档 */
  isArchived: boolean;
}

/**
 * 创建备忘录的输入类型
 * 
 * 用于创建新备忘录时传递的数据。
 */
export interface MemoCreateInput {
  /** 备忘录标题（必填） */
  title: string;
  /** 备忘录正文内容 */
  content?: string;
}

/**
 * 更新备忘录的输入类型
 * 
 * 用于更新现有备忘录，id 为必填，其他字段可选。
 */
export interface MemoUpdateInput {
  /** 备忘录 ID（必填） */
  id: number;
  /** 更新后的标题 */
  title?: string;
  /** 更新后的内容 */
  content?: string;
  /** 更新后的置顶状态 */
  isPinned?: boolean;
  /** 更新后的归档状态 */
  isArchived?: boolean;
}

/**
 * 备忘录列表项（精简版）
 * 
 * 用于备忘录列表展示，不包含完整 content 字段，
 * 减少数据传输量，加快列表加载速度。
 */
export interface MemoListItem {
  /** 备忘录 ID */
  id: number;
  /** 备忘录标题 */
  title: string;
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 是否置顶 */
  isPinned: boolean;
  /** 是否归档 */
  isArchived: boolean;
}