import AdminLeadEdit from "./admin-lead-edit";

export default async function AdminLeadEditPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <AdminLeadEdit leadId={id} />;
}
