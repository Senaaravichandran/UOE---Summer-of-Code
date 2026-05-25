import numbers
import random
import numpy as np
import math
import collections
import collections.abc
import torch
from . import functional as F
import cv2
import warnings
import types

__all__ = [
    "Compose",
    "ToTensor",
    "ClipToTensor",
    "Lambda",
    "Normalize",
    "Resize",
    "RandomCrop",
    "CenterCrop",
    "RandomHorizontalFlip",
    "RandomVerticalFlip",
    "RandomResizedCrop",
    "TenCrop",
    "ColorJitter",
    "RandomRotation",
    "RandomGrayScale",
    "TenCropTensor",
    "MultiScaleCrop",
]

_cv2_pad_to_str = {
    "constant": cv2.BORDER_CONSTANT,
    "edge": cv2.BORDER_REPLICATE,
    "reflect": cv2.BORDER_REFLECT_101,
    "symmetric": cv2.BORDER_REFLECT,
}
_cv2_interpolation_to_str = {
    "nearest": cv2.INTER_NEAREST,
    "bilinear": cv2.INTER_LINEAR,
    "area": cv2.INTER_AREA,
    "bicubic": cv2.INTER_CUBIC,
    "lanczos": cv2.INTER_LANCZOS4,
}
_cv2_interpolation_from_str = {v: k for k, v in _cv2_interpolation_to_str.items()}


class Compose(object):

    def __init__(self, transforms):
        self.transforms = transforms

    def __call__(self, clip):
        for t in self.transforms:
            clip = t(clip)
        return clip


class ToTensor(object):

    def __call__(self, pic, div_255=None):
        return F.to_tensor(pic, div_255=div_255)

    def __repr__(self):
        return self.__class__.__name__ + "()"


class ClipToTensor(object):
    def __init__(self, channel_nb=3, div_255=True):
        self.channel_nb = channel_nb
        self.div_255 = div_255

    def __call__(self, clip):
        # Retrieve shape
        if isinstance(clip[0], np.ndarray):
            h, w, ch = clip[0].shape
            assert ch == self.channel_nb, "Got {0} instead of 3 channels".format(ch)
        else:
            raise TypeError(
                "Expected numpy.ndarray, not recommend PIL.Image as it is slow\
            but got list of {0}".format(
                    type(clip[0])
                )
            )

        clip = np.stack(clip, axis=0).astype(float)
        if self.div_255:
            clip = clip / 255.0
        clip = torch.from_numpy(clip).float()
        clip = clip.permute([3, 0, 1, 2])
        return clip


class Lambda(object):

    def __init__(self, lambd):
        assert isinstance(lambd, types.LambdaType)
        self.lambd = lambd

    def __call__(self, img):
        return self.lambd(img)

    def __repr__(self):
        return self.__class__.__name__ + "()"


class Normalize(object):

    def __init__(self, mean, std, format="CTHW"):
        self.mean = mean
        self.std = std
        self.format = format

    def __call__(self, tensor):
        if self.format == "CTHW":
            tensor = tensor.permute([1, 2, 3, 0])
            for i in range(tensor.shape[0]):
                tensor[i] = F.normalize(tensor[i], self.mean, self.std)
            tensor = tensor.permute([3, 0, 1, 2])
        elif self.format == "THWC":
            for i in range(tensor.shape[0]):
                tensor[i] = F.normalize(tensor[i], self.mean, self.std)
        else:
            raise ValueError("Expected format in between [CTWH, THWC]")
        return tensor


class Resize(object):

    def __init__(self, size, interpolation="bilinear"):
        # assert isinstance(size, int) or (isinstance(size, collections.Iterable) and len(size) == 2)
        if isinstance(size, int):
            self.size = (size, size)
        elif isinstance(size, collections.abc.Iterable) and len(size) == 2:
            if type(size) == list:
                size = tuple(size)
            self.size = size
        else:
            raise ValueError("Unknown inputs for size: {}".format(size))
        self.interpolation = _cv2_interpolation_to_str[interpolation]

    def __call__(self, clip):
        return [F.resize(img, self.size, self.interpolation) for img in clip]

    def __repr__(self):
        interpolate_str = _cv2_interpolation_from_str[self.interpolation]
        return self.__class__.__name__ + "(size={0}, interpolation={1})".format(
            self.size, interpolate_str
        )


class RandomCrop(object):

    def __init__(self, size):
        self.size = size

    def __call__(self, clip):
        h, w = self.size
        img_h, img_w, _ = clip[0].shape

        if w > img_w or h > img_h:
            error_msg = (
                "Initial tensor spatial size should be larger then "
                "cropped size but got cropped sizes : ({w}, {h}) while "
                "initial tensor is ({t_w}, {t_h})".format(
                    t_w=img_w, t_h=img_h, w=w, h=h
                )
            )
            raise ValueError(error_msg)
        x1 = random.randint(0, img_w - w)
        y1 = random.randint(0, img_h - h)
        cropped = [F.crop(img, y1, x1, h, w) for img in clip]
        return cropped


class CenterCrop(object):

    def __init__(self, size):
        if isinstance(size, numbers.Number):
            self.size = (int(size), int(size))
        else:
            self.size = size

    def __call__(self, clip):
        return [F.center_crop(img, self.size) for img in clip]

    def __repr__(self):
        return self.__class__.__name__ + "(size={0})".format(self.size)


class RandomHorizontalFlip(object):

    def __init__(self, p=0.5):
        self.p = p

    def __call__(self, clip):
        if random.random() < self.p:
            if isinstance(clip[0], np.ndarray):
                return [F.hflip(img) for img in clip]
            else:
                raise TypeError(
                    "Expected numpy.ndarray, not recommend PIL.Image as it is slow"
                    + " but got list of {0}".format(type(clip[0]))
                )
        return clip

    def __repr__(self):
        return self.__class__.__name__ + "(p={})".format(self.p)


class RandomVerticalFlip(object):

    def __init__(self, p=0.5):
        self.p = p

    def __call__(self, clip):
        if random.random() < self.p:
            if isinstance(clip[0], np.ndarray):
                return [F.vflip(img) for img in clip]
            else:
                raise TypeError(
                    "Expected numpy.ndarray, not recommend PIL.Image as it is slow"
                    + " but got list of {0}".format(type(clip[0]))
                )
        return clip

    def __repr__(self):
        return self.__class__.__name__ + "(p={})".format(self.p)


class RandomResizedCrop(object):

    def __init__(
        self,
        size,
        scale=(0.08, 1.0),
        ratio=(3.0 / 4.0, 4.0 / 3.0),
        interpolation="bilinear",
    ):
        if isinstance(size, (tuple, list)):
            self.size = size
        else:
            self.size = (size, size)
        if (scale[0] > scale[1]) or (ratio[0] > ratio[1]):
            warnings.warn("range should be of kind (min, max)")

        self.interpolation = _cv2_interpolation_to_str[interpolation]
        self.scale = scale
        self.ratio = ratio

    @staticmethod
    def get_params(clip, scale, ratio):
        if isinstance(clip[0], np.ndarray):
            height, width, im_c = clip[0].shape
        else:
            raise TypeError(
                "Expected numpy.ndarray, not recommend PIL.Image as it is slow"
            )
        area = height * width

        for _ in range(10):
            target_area = random.uniform(*scale) * area
            log_ratio = (math.log(ratio[0]), math.log(ratio[1]))
            aspect_ratio = math.exp(random.uniform(*log_ratio))

            w = int(round(math.sqrt(target_area * aspect_ratio)))
            h = int(round(math.sqrt(target_area / aspect_ratio)))

            if 0 < w <= width and 0 < h <= height:
                i = random.randint(0, height - h)
                j = random.randint(0, width - w)
                return i, j, h, w

        # Fallback to central crop
        in_ratio = float(width) / float(height)
        if in_ratio < min(ratio):
            w = width
            h = int(round(w / min(ratio)))
        elif in_ratio > max(ratio):
            h = height
            w = int(round(h * max(ratio)))
        else:  # whole image
            w = width
            h = height
        i = (height - h) // 2
        j = (width - w) // 2
        return i, j, h, w

    def __call__(self, clip):
        i, j, h, w = self.get_params(clip, self.scale, self.ratio)
        clip = [
            F.resized_crop(img, i, j, h, w, self.size, self.interpolation)
            for img in clip
        ]

        return clip

    def __repr__(self):
        interpolate_str = _cv2_interpolation_to_str[self.interpolation]
        format_string = self.__class__.__name__ + "(size={0}".format(self.size)
        format_string += ", scale={0}".format(tuple(round(s, 4) for s in self.scale))
        format_string += ", ratio={0}".format(tuple(round(r, 4) for r in self.ratio))
        format_string += ", interpolation={0})".format(interpolate_str)
        return format_string


class MultiScaleCrop(object):
    def __init__(
        self,
        input_size,
        scales=None,
        max_distort=1,
        fix_crop=True,
        more_fix_crop=True,
        interpolation="bilinear",
    ):
        self.scales = scales if scales is not None else [1, 0.875, 0.75, 0.66]
        self.max_distort = max_distort
        self.fix_crop = fix_crop
        self.more_fix_crop = more_fix_crop
        self.input_size = (
            input_size if not isinstance(input_size, int) else [input_size, input_size]
        )
        self.interpolation = _cv2_interpolation_to_str[interpolation]

    @staticmethod
    def fill_fix_offset(more_fix_crop, image_w, image_h, crop_w, crop_h):
        w_step = (image_w - crop_w) // 4
        h_step = (image_h - crop_h) // 4

        ret = list()
        ret.append((0, 0))  # upper left
        ret.append((4 * w_step, 0))  # upper right
        ret.append((0, 4 * h_step))  # lower left
        ret.append((4 * w_step, 4 * h_step))  # lower right
        ret.append((2 * w_step, 2 * h_step))  # center

        if more_fix_crop:
            ret.append((0, 2 * h_step))  # center left
            ret.append((4 * w_step, 2 * h_step))  # center right
            ret.append((2 * w_step, 4 * h_step))  # lower center
            ret.append((2 * w_step, 0 * h_step))  # upper center

            ret.append((1 * w_step, 1 * h_step))  # upper left quarter
            ret.append((3 * w_step, 1 * h_step))  # upper right quarter
            ret.append((1 * w_step, 3 * h_step))  # lower left quarter
            ret.append((3 * w_step, 3 * h_step))  # lower righ quarter

        return ret

    def get_params(self, size):
        img_h, img_w = size
        base_size = min(img_h, img_w)
        crop_sizes = [int(base_size * x) for x in self.scales]
        crop_h = [
            self.input_size[0] if abs(x - self.input_size[0]) < 3 else x
            for x in crop_sizes
        ]
        crop_w = [
            self.input_size[1] if abs(x - self.input_size[1]) < 3 else x
            for x in crop_sizes
        ]
        pairs = []
        for i, h in enumerate(crop_h):
            for j, w in enumerate(crop_w):
                if abs(i - j) <= self.max_distort:
                    pairs.append((h, w))

        crop_pair = random.choice(pairs)
        if not self.fix_crop:
            w_offset = random.randint(0, img_w - crop_pair[1])
            h_offset = random.randint(0, img_h - crop_pair[0])
        else:
            w_offset, h_offset = random.choice(
                self.fill_fix_offset(
                    self.more_fix_crop, img_w, img_h, crop_pair[1], crop_pair[0]
                )
            )
        return crop_pair[0], crop_pair[1], h_offset, w_offset

    def __call__(self, clip, is_flow=False):
        h, w = clip[0].shape[:2]
        crop_h, crop_w, offset_h, offset_w = self.get_params((h, w))
        return [
            F.resized_crop(img, offset_h, offset_w, crop_h, crop_w, self.input_size)
            for img in clip
        ]


class RandomBlackBoundary(object):
    def __init__(self, max_boundary_width, max_boundary_height):
        self.max_boundary_height = max_boundary_height
        self.max_boundary_width = max_boundary_width

    @staticmethod
    def get_params(clip, max_boundary_width, max_boundary_height):
        if isinstance(clip[0], np.ndarray):
            height, width, im_c = clip[0].shape
        else:
            raise TypeError(
                "Expected numpy.ndarray, not recommend PIL.Image as it is slow"
            )
        assert (
            height > max_boundary_height * 2
        ), "height must be larger than 2* max_boundary_height"
        assert (
            width > max_boundary_width * 2
        ), "width must be larger than 2* max_boundary_width"
        pad_h = random.randint(0, max_boundary_height)
        pad_w = random.randint(0, max_boundary_width)

        return pad_h, pad_w, height, width

    def __call__(self, clip):
        pad_h, pad_w, h, w = self.get_params(
            clip, self.max_boundary_width, self.max_boundary_height
        )
        clip = [
            cv2.copyMakeBorder(
                frame[pad_h : h - pad_h, pad_w : w - pad_w],
                pad_h,
                pad_h,
                pad_w,
                pad_w,
                cv2.BORDER_CONSTANT,
            )
            for frame in clip
        ]
        return clip


class TenCrop(object):
    def __init__(self, size, vertical_flip=False):
        self.size = size
        if isinstance(size, numbers.Number):
            self.size = (int(size), int(size))
        else:
            assert len(size) == 2, "Please provide only two dimensions (h, w) for size."
            self.size = size
        self.vertical_flip = vertical_flip

    def __call__(self, clip):
        return [F.ten_crop(img, self.size, self.vertical_flip) for img in clip]

    def __repr__(self):
        return self.__class__.__name__ + "(size={0}, vertical_flip={1})".format(
            self.size, self.vertical_flip
        )


class TenCropTensor(object):

    def __init__(self, size, vertical_flip=False):
        self.size = size
        if isinstance(size, numbers.Number):
            self.size = (int(size), int(size))
        else:
            assert len(size) == 2, "Please provide only two dimensions (h, w) for size."
            self.size = size
        self.vertical_flip = vertical_flip

    def __call__(self, clip):
        # clip expected as [C,T, H, W]
        assert clip.shape[0] == 3, "Expected input shape as [C,T, H, W]"
        if isinstance(clip, torch.Tensor):
            return F.ten_crop_tensor(clip, self.size)
        else:
            raise TypeError("Expected torch.Tensor,but got {} here".format(type(clip)))

    def __repr__(self):
        return self.__class__.__name__ + "(size={0}, vertical_flip={1})".format(
            self.size, self.vertical_flip
        )


class RandomGrayScale(object):
    def __init__(self, p=0.1):
        super().__init__()
        self.p = p

    def __call__(self, clip):
        num_output_channels = 1 if len(clip[0].shape) == 2 else 3
        if torch.rand(1) < self.p:
            for i in range(len(clip)):
                clip[i] = F.to_grayscale(clip[i], num_output_channels)
        return clip


class ColorJitter(object):
    def __init__(self, brightness=0, contrast=0, saturation=0, hue=0):
        self.brightness = self._check_input(brightness, "brightness")
        self.contrast = self._check_input(contrast, "contrast")
        self.saturation = self._check_input(saturation, "saturation")
        self.hue = self._check_input(
            hue, "hue", center=0, bound=(-0.5, 0.5), clip_first_on_zero=False
        )
        # if self.saturation is not None:
        #     warnings.warn('Saturation jitter enabled. Will slow down loading immensely.')
        if self.hue is not None:
            warnings.warn("Hue jitter enabled. Will slow down loading immensely.")

    def _check_input(
        self, value, name, center=1, bound=(0, float("inf")), clip_first_on_zero=True
    ):
        if isinstance(value, numbers.Number):
            if value < 0:
                raise ValueError(
                    "If {} is a single number, it must be non negative.".format(name)
                )
            value = [center - value, center + value]
            if clip_first_on_zero:
                value[0] = max(value[0], 0)
        elif isinstance(value, (tuple, list)) and len(value) == 2:
            if not bound[0] <= value[0] <= value[1] <= bound[1]:
                raise ValueError("{} values should be between {}".format(name, bound))
        else:
            raise TypeError(
                "{} should be a single number or a list/tuple with length 2.".format(
                    name
                )
            )

        # if value is 0 or (1., 1.) for brightness/contrast/saturation
        # or (0., 0.) for hue, do nothing
        if value[0] == value[1] == center:
            value = None
        return value

    @staticmethod
    def get_params(brightness, contrast, saturation, hue):
        transforms = []

        if brightness is not None:
            brightness_factor = random.uniform(brightness[0], brightness[1])
            transforms.append(
                Lambda(lambda img: F.adjust_brightness(img, brightness_factor))
            )

        if contrast is not None:
            contrast_factor = random.uniform(contrast[0], contrast[1])
            transforms.append(
                Lambda(lambda img: F.adjust_contrast(img, contrast_factor))
            )

        if saturation is not None:
            saturation_factor = random.uniform(saturation[0], saturation[1])
            transforms.append(
                Lambda(lambda img: F.adjust_saturation(img, saturation_factor))
            )

        if hue is not None:
            hue_factor = random.uniform(hue[0], hue[1])
            transforms.append(Lambda(lambda img: F.adjust_hue(img, hue_factor)))

        random.shuffle(transforms)
        transform = Compose(transforms)

        return transform

    def __call__(self, clip):
        transform = self.get_params(
            self.brightness, self.contrast, self.saturation, self.hue
        )

        return [transform(img) for img in clip]

    def __repr__(self):
        format_string = self.__class__.__name__ + "("
        format_string += "brightness={0}".format(self.brightness)
        format_string += ", contrast={0}".format(self.contrast)
        format_string += ", saturation={0}".format(self.saturation)
        format_string += ", hue={0})".format(self.hue)
        return format_string


class RandomRotation(object):

    def __init__(self, degrees, resample=False, expand=False, center=None):
        if isinstance(degrees, numbers.Number):
            if degrees < 0:
                raise ValueError("If degrees is a single number, it must be positive.")
            self.degrees = (-degrees, degrees)
        else:
            if len(degrees) != 2:
                raise ValueError("If degrees is a sequence, it must be of len 2.")
            self.degrees = degrees

        self.resample = resample
        self.expand = expand
        self.center = center

    @staticmethod
    def get_params(degrees):
        angle = random.uniform(degrees[0], degrees[1])

        return angle

    def __call__(self, clip):
        angle = self.get_params(self.degrees)

        return [
            F.rotate(img, angle, self.resample, self.expand, self.center)
            for img in clip
        ]

    def __repr__(self):
        format_string = self.__class__.__name__ + "(degrees={0}".format(self.degrees)
        format_string += ", resample={0}".format(self.resample)
        format_string += ", expand={0}".format(self.expand)
        if self.center is not None:
            format_string += ", center={0}".format(self.center)
        format_string += ")"
        return format_string
