import ContextUsage from '@components/views/ContextUsage'

const ContextLimitPreview = ({ generatedLength }: { generatedLength: number }) => (
    <ContextUsage generatedLength={generatedLength} />
)
export default ContextLimitPreview
