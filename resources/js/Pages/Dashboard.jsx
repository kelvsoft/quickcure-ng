import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

// FIX: Added default values (= [] and = {}) to the props to prevent "undefined" errors
export default function Dashboard({ auth, hospitals = [], stats = { total: 0, available: 0 } }) {
    
    const { data, setData, post, processing } = useForm({
        hospital_id: '',
    });

    const submitRequest = (hospitalId) => {
        // We use a callback to ensure the ID is set before the POST happens
        post(route('admin.magic-link.send', { hospital_id: hospitalId }), {
            preserveScroll: true,
            onSuccess: () => alert('Update request sent successfully!'),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Admin Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* Stats Section with Optional Chaining (?.) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium">Total Registered</h3>
                            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-green-200">
                            <h3 className="text-green-600 text-sm font-medium">Currently Available</h3>
                            <p className="text-2xl font-bold">{stats?.available ?? 0}</p>
                        </div>
                    </div>

                    {/* Hospitals Table */}
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hospital</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {hospitals.length > 0 ? (
                                    hospitals.map((hospital) => (
                                        <tr key={hospital.id}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900">{hospital.name}</div>
                                                <div className="text-xs text-gray-500">{hospital.address}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 text-xs rounded-full ${hospital.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {hospital.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => submitRequest(hospital.id)}
                                                    disabled={processing}
                                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 transition"
                                                >
                                                    {processing ? 'Processing...' : 'Request Update'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-4 text-center text-gray-500">No hospitals found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}