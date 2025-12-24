/**
 * Flowise Custom Tool: PPTX Generator
 *
 * このファイルをFlowiseのcustom toolsディレクトリに配置して使用します。
 * Flowise/packages/components/nodes/tools/CustomTool/
 */

import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

class PPTXGenerator_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'PPTX Generator'
        this.name = 'pptxGenerator'
        this.version = 1.0
        this.type = 'PPTXGenerator'
        this.icon = 'pptx.svg'
        this.category = 'Tools'
        this.description = 'PowerPointプレゼンテーションを生成するツール'
        this.baseClasses = [this.type, ...getBaseClasses(DynamicStructuredTool)]
        this.inputs = [
            {
                label: 'PPTX Service URL',
                name: 'serviceUrl',
                type: 'string',
                default: 'http://localhost:8100',
                description: 'PPTX生成サービスのURL'
            },
            {
                label: 'Default Template ID',
                name: 'defaultTemplateId',
                type: 'string',
                optional: true,
                description: 'デフォルトで使用するテンプレートID'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const serviceUrl = nodeData.inputs?.serviceUrl as string
        const defaultTemplateId = nodeData.inputs?.defaultTemplateId as string

        const slideSchema = z.object({
            layout_index: z.number().optional().describe('使用するレイアウトのインデックス'),
            title: z.string().optional().describe('スライドのタイトル'),
            subtitle: z.string().optional().describe('サブタイトル'),
            body: z.string().optional().describe('本文テキスト'),
            bullets: z.array(z.string()).optional().describe('箇条書きリスト'),
            notes: z.string().optional().describe('発表者ノート')
        })

        return new DynamicStructuredTool({
            name: 'pptx_generator',
            description: `PowerPointプレゼンテーションを生成します。

使用方法:
1. action: "list_templates" - 利用可能なテンプレート一覧を取得
2. action: "analyze_template" - テンプレートの構造を解析
3. action: "generate" - 新規プレゼンテーションを生成
4. action: "fill_template" - 既存テンプレートにコンテンツを埋め込む

スライドを作成するには、slidesに各スライドの内容を配列で指定します。
各スライドには title, subtitle, body, bullets（箇条書き）, notes（発表者ノート）を設定できます。`,

            schema: z.object({
                action: z.enum(['list_templates', 'analyze_template', 'generate', 'fill_template'])
                    .describe('実行するアクション'),
                template_id: z.string().optional()
                    .describe('使用するテンプレートID'),
                slides: z.array(slideSchema).optional()
                    .describe('スライドコンテンツの配列'),
                output_filename: z.string().optional()
                    .describe('出力ファイル名')
            }),

            func: async ({ action, template_id, slides, output_filename }) => {
                const templateId = template_id || defaultTemplateId

                try {
                    switch (action) {
                        case 'list_templates': {
                            const response = await fetch(`${serviceUrl}/templates`)
                            const data = await response.json()
                            return JSON.stringify(data, null, 2)
                        }

                        case 'analyze_template': {
                            if (!templateId) {
                                return 'Error: template_id is required for analyze_template action'
                            }
                            const response = await fetch(`${serviceUrl}/templates/${templateId}/analyze`)
                            const data = await response.json()
                            return JSON.stringify(data, null, 2)
                        }

                        case 'generate': {
                            if (!slides || slides.length === 0) {
                                return 'Error: slides array is required for generate action'
                            }
                            const response = await fetch(`${serviceUrl}/generate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    template_id: templateId,
                                    slides,
                                    output_filename
                                })
                            })
                            const data = await response.json()
                            return JSON.stringify(data, null, 2)
                        }

                        case 'fill_template': {
                            if (!templateId) {
                                return 'Error: template_id is required for fill_template action'
                            }
                            if (!slides || slides.length === 0) {
                                return 'Error: slides array is required for fill_template action'
                            }
                            const response = await fetch(`${serviceUrl}/templates/${templateId}/fill`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    slides,
                                    output_filename
                                })
                            })
                            const data = await response.json()
                            return JSON.stringify(data, null, 2)
                        }

                        default:
                            return `Unknown action: ${action}`
                    }
                } catch (error: any) {
                    return `Error: ${error.message}`
                }
            }
        })
    }
}

module.exports = { nodeClass: PPTXGenerator_Tools }
