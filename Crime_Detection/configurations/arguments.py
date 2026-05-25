import argparse
import os


def setup_parser():
    parser = argparse.ArgumentParser(
        description="Video Anomaly Detection Configuration"
    )

    parser.add_argument(
        "--model_type",
        type=str,
        default="UCF_I3D",
        choices=["UCF_C3D", "UCF_I3D", "SHT_C3D", "SHT_I3D"],
        help="Model architecture to use",
    )

    parser.add_argument(
        "--expansion_factor",
        type=int,
        default=8,
        help="Expansion factor for the network",
    )
    parser.add_argument(
        "--gpu_ids",
        type=str,
        default="0,1,2,3",
        help="Comma-separated list of GPU IDs to use",
    )
    parser.add_argument(
        "--batch_size", type=int, default=10, help="Batch size for training"
    )
    parser.add_argument(
        "--dropout_prob", type=float, default=0.8, help="Dropout probability"
    )
    parser.add_argument(
        "--clip_length", type=int, default=16, help="Number of frames per video segment"
    )
    parser.add_argument(
        "--learning_rate", type=float, default=1e-4, help="Initial learning rate"
    )
    parser.add_argument(
        "--weight_decay", type=float, default=5e-4, help="Weight decay coefficient"
    )

    parser.add_argument(
        "--use_ten_crop",
        action="store_true",
        help="Use ten-crop testing for evaluation",
    )
    parser.set_defaults(use_ten_crop=False)

    parser.add_argument(
        "--visualize_results",
        action="store_true",
        help="Generate visualizations for UCF results",
    )
    parser.set_defaults(visualize_results=False)

    return parser


def parse_arguments():
    parser = setup_parser()
    args = parser.parse_args()

    os.environ["CUDA_VISIBLE_DEVICES"] = args.gpu_ids
    args.available_gpus = list(range(len(args.gpu_ids.split(","))))

    if args.visualize_results and args.model_type != "UCF_C3D":
        print(
            "Warning: Visualization only supported for UCF_C3D model. Disabling visualization."
        )
        args.visualize_results = False

    return args
