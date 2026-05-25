import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

const DangerZone = () => {
	return (
		<motion.div
			className='bg-[rgba(0,230,143,0.1)] backdrop-filter backdrop-blur-lg shadow-lg rounded-xl p-6 border border-green-500 mb-8'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
		>
			<div className='flex items-center mb-4'>
				<Trash2 className='text-green-400 mr-3' size={24} />
				<h2 className='text-xl font-semibold text-gray-100'>Danger Zone</h2>
			</div>
			<p className='text-gray-300 mb-4'>Permanently delete your account and all of your content.</p>
			<button
				className='bg-green-500 hover:bg-[rgba(0,255,0,0.8)] text-white font-bold py-2 px-4 rounded 
      transition duration-200'
			>
				Delete Account
			</button>
		</motion.div>
	);
};
export default DangerZone;
