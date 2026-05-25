import torch
import math
import random

# from PIL import Image, ImageOps, ImageEnhance, PILLOW_VERSION
try:
    import accimage  # type: ignore
except ImportError:
    accimage = None
import numpy as np
import numbers
import types
import collections
import collections.abc
import warnings
import cv2
from PIL import Image

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


def _is_pil_image(img):
    if accimage is not None:
        return isinstance(img, (Image.Image, accimage.Image))
    else:
        return isinstance(img, Image.Image)


def _is_tensor_image(img):
    return torch.is_tensor(img) and img.ndimension() == 3


def _is_numpy_image(img):
    return isinstance(img, np.ndarray) and (img.ndim in {2, 3})


def to_tensor(pic, div_255=None):
    if not (_is_numpy_image(pic)):
        raise TypeError("pic should be ndarray. Got {}".format(type(pic)))

    # handle numpy array
    img = torch.from_numpy(pic.transpose((2, 0, 1)))
    # backward compatibility
    if not div_255:
        return img.float()
    # if isinstance(img, torch.ByteTensor) or img.dtype == torch.uint8:
    #     if div_255==None or div_255:
    #         return img.float().div(255)
    # else:
    else:
        return img.float().div(255)


def normalize(tensor, mean, std):
    if not _is_tensor_image(tensor):
        raise TypeError("tensor is not a torch image.")

    # This is faster than using broadcasting, don't change without benchmarking
    for t, m, s in zip(tensor, mean, std):
        t.sub_(m).div_(s)
    return tensor


def resize(img, size, interpolation=cv2.INTER_LINEAR):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy image. Got {}".format(type(img)))
    if not (
        isinstance(size, int)
        or (isinstance(size, collections.abc.Iterable) and len(size) == 2)
    ):
        raise TypeError("Got inappropriate size arg: {}".format(size))
    (
        w,
        h,
    ) = size

    if isinstance(size, int):
        if (w <= h and w == size) or (h <= w and h == size):
            return img
        if w < h:
            ow = size
            oh = int(size * h / w)
            output = cv2.resize(img, dsize=(ow, oh), interpolation=interpolation)
        else:
            oh = size
            ow = int(size * w / h)
            output = cv2.resize(img, dsize=(ow, oh), interpolation=interpolation)
    else:
        output = cv2.resize(img, dsize=(size[1], size[0]), interpolation=interpolation)
    if img.shape[2] == 1:
        return output[:, :, np.newaxis]
    else:
        return output


def scale(*args, **kwargs):
    warnings.warn(
        "The use of the transforms.Scale transform is deprecated, "
        + "please use transforms.Resize instead."
    )
    return resize(*args, **kwargs)


def pad(img, padding, fill=0, padding_mode="constant"):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy ndarray. Got {}".format(type(img)))
    if not isinstance(padding, (numbers.Number, tuple, list)):
        raise TypeError("Got inappropriate padding arg")
    if not isinstance(fill, (numbers.Number, str, tuple)):
        raise TypeError("Got inappropriate fill arg")
    if not isinstance(padding_mode, str):
        raise TypeError("Got inappropriate padding_mode arg")
    if isinstance(padding, collections.abc.Sequence) and len(padding) not in [2, 4]:
        raise ValueError(
            "Padding must be an int or a 2, or 4 element tuple, not a "
            + "{} element tuple".format(len(padding))
        )

    assert padding_mode in [
        "constant",
        "edge",
        "reflect",
        "symmetric",
    ], "Padding mode should be either constant, edge, reflect or symmetric"

    if isinstance(padding, int):
        pad_left = pad_right = pad_top = pad_bottom = padding
    if isinstance(padding, collections.abc.Sequence) and len(padding) == 2:
        pad_left = pad_right = padding[0]
        pad_top = pad_bottom = padding[1]
    if isinstance(padding, collections.abc.Sequence) and len(padding) == 4:
        pad_left = padding[0]
        pad_top = padding[1]
        pad_right = padding[2]
        pad_bottom = padding[3]
    if img.shape[2] == 1:
        return cv2.copyMakeBorder(
            img,
            top=pad_top,
            bottom=pad_bottom,
            left=pad_left,
            right=pad_right,
            borderType=_cv2_pad_to_str[padding_mode],
            value=fill,
        )[:, :, np.newaxis]
    else:
        return cv2.copyMakeBorder(
            img,
            top=pad_top,
            bottom=pad_bottom,
            left=pad_left,
            right=pad_right,
            borderType=_cv2_pad_to_str[padding_mode],
            value=fill,
        )


def crop(img, i, j, h, w):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy image. Got {}".format(type(img)))

    return img[i : i + h, j : j + w, :]


def center_crop(img, output_size):
    if isinstance(output_size, numbers.Number):
        output_size = (int(output_size), int(output_size))
    h, w = img.shape[0:2]
    th, tw = output_size
    i = int(round((h - th) / 2.0))
    j = int(round((w - tw) / 2.0))
    return crop(img, i, j, th, tw)


def resized_crop(img, i, j, h, w, size, interpolation=cv2.INTER_LINEAR):
    assert _is_numpy_image(img), "img should be numpy image"
    img = crop(img, i, j, h, w)
    img = resize(img, size, interpolation=interpolation)
    return img


def hflip(img):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy image. Got {}".format(type(img)))
    # img[:,::-1] is much faster, but doesn't work with torch.from_numpy()!
    if img.shape[2] == 1:
        return cv2.flip(img, 1)[:, :, np.newaxis]
    else:
        return cv2.flip(img, 1)


def vflip(img):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))
    if img.shape[2] == 1:
        return cv2.flip(img, 0)[:, :, np.newaxis]
    else:
        return cv2.flip(img, 0)
    # img[::-1] is much faster, but doesn't work with torch.from_numpy()!


def five_crop(img, size):
    if isinstance(size, numbers.Number):
        size = (int(size), int(size))
    else:
        assert len(size) == 2, "Please provide only two dimensions (h, w) for size."

    h, w = img.shape[0:2]
    crop_w, crop_h = size
    if crop_w > w or crop_h > h:
        raise ValueError(
            "Requested crop size {} is bigger than input size {}".format(size, (h, w))
        )
    tl = crop(img, 0, 0, crop_h, crop_w)
    tr = crop(img, 0, w - crop_w, crop_h, crop_w)
    bl = crop(img, h - crop_h, 0, crop_h, crop_w)
    br = crop(img, h - crop_h, w - crop_w, crop_h, crop_w)
    center = center_crop(img, (crop_h, crop_w))
    return [tl, tr, bl, br, center]


def ten_crop(img, size, vertical_flip=False):
    if isinstance(size, numbers.Number):
        size = (int(size), int(size))
    else:
        assert len(size) == 2, "Please provide only two dimensions (h, w) for size."

    first_five = five_crop(img, size)

    if vertical_flip:
        img = vflip(img)
    else:
        img = hflip(img)

    second_five = five_crop(img, size)
    return first_five + second_five


def five_crop_tensor(clip, size):
    # suppose clip is with shape [C,T,W,H]
    if isinstance(size, numbers.Number):
        size = (int(size), int(size))
    else:
        assert len(size) == 2, "Please provide only two dimensions (h, w) for size."

    h, w = clip.shape[-2:]
    crop_h, crop_w = size
    if crop_w > w or crop_h > h:
        raise ValueError(
            "Requested crop size {} is bigger than input size {}".format(size, (h, w))
        )
    c_t = int((h - crop_h + 1) * 0.5)
    c_l = int((w - crop_w + 1) * 0.5)
    tl = clip[:, :, 0:crop_h, 0:crop_w]
    tr = clip[:, :, 0:crop_h, w - crop_w : w]
    bl = clip[:, :, h - crop_h : h, 0:crop_w]
    br = clip[:, :, h - crop_h : h, w - crop_w : w]
    center = clip[:, :, c_t : c_t + crop_h, c_l : c_l + crop_w]
    return [tl, tr, bl, br, center]


def ten_crop_tensor(clip, size):
    if isinstance(size, numbers.Number):
        size = (int(size), int(size))
    else:
        assert len(size) == 2, "Please provide only two dimensions (h, w) for size."

    first_five = five_crop_tensor(clip, size)
    clip = clip.flip(-1)
    next_five = five_crop_tensor(clip, size)
    return first_five + next_five


def adjust_brightness(img, brightness_factor):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))
    table = (
        np.array([i * brightness_factor for i in range(0, 256)])
        .clip(0, 255)
        .astype("uint8")
    )
    # same thing but a bit slower
    # cv2.convertScaleAbs(img, alpha=brightness_factor, beta=0)
    if img.shape[2] == 1:
        return cv2.LUT(img, table)[:, :, np.newaxis]
    else:
        return cv2.LUT(img, table)


def adjust_contrast(img, contrast_factor):
    # much faster to use the LUT construction than anything else I've tried
    # it's because you have to change dtypes multiple times
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))
    table = (
        np.array([(i - 74) * contrast_factor + 74 for i in range(0, 256)])
        .clip(0, 255)
        .astype("uint8")
    )
    # enhancer = ImageEnhance.Contrast(img)
    # img = enhancer.enhance(contrast_factor)
    if img.shape[2] == 1:
        return cv2.LUT(img, table)[:, :, np.newaxis]
    else:
        return cv2.LUT(img, table)


def adjust_saturation(img, saturation_factor):
    # ~10ms slower than PIL!
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))
    M = np.float32(
        [
            [1 + 2 * saturation_factor, 1 - saturation_factor, 1 - saturation_factor],
            [1 - saturation_factor, 1 + 2 * saturation_factor, 1 - saturation_factor],
            [1 - saturation_factor, 1 - saturation_factor, 1 + 2 * saturation_factor],
        ]
    )
    shape = img.shape
    img = np.matmul(img.reshape(-1, 3), M).reshape(shape) / 3
    img = np.clip(img, 0, 255).astype(np.uint8)
    return img


def adjust_hue(img, hue_factor):
    # After testing, found that OpenCV calculates the Hue in a call to
    # cv2.cvtColor(..., cv2.COLOR_BGR2HSV) differently from PIL

    # This function takes 160ms! should be avoided
    if not (-0.5 <= hue_factor <= 0.5):
        raise ValueError("hue_factor is not in [-0.5, 0.5].".format(hue_factor))
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))
    img = Image.fromarray(img)
    input_mode = img.mode
    if input_mode in {"L", "1", "I", "F"}:
        return np.array(img)

    h, s, v = img.convert("HSV").split()

    np_h = np.array(h, dtype=np.uint8)
    # uint8 addition take cares of rotation across boundaries
    with np.errstate(over="ignore"):
        np_h += np.uint8(hue_factor * 255)
    h = Image.fromarray(np_h, "L")

    img = Image.merge("HSV", (h, s, v)).convert(input_mode)
    return np.array(img)


def adjust_gamma(img, gamma, gain=1):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))

    if gamma < 0:
        raise ValueError("Gamma should be a non-negative real number")
    # from here
    # https://stackoverflow.com/questions/33322488/how-to-change-image-illumination-in-opencv-python/41061351
    table = np.array(
        [((i / 255.0) ** gamma) * 255 * gain for i in np.arange(0, 256)]
    ).astype("uint8")
    if img.shape[2] == 1:
        return cv2.LUT(img, table)[:, :, np.newaxis]
    else:
        return cv2.LUT(img, table)


def rotate(img, angle, resample=False, expand=False, center=None):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))
    rows, cols = img.shape[0:2]
    if center is None:
        center = (cols / 2, rows / 2)
    M = cv2.getRotationMatrix2D(center, angle, 1)
    if img.shape[2] == 1:
        return cv2.warpAffine(img, M, (cols, rows))[:, :, np.newaxis]
    else:
        return cv2.warpAffine(img, M, (cols, rows))


def _get_affine_matrix(center, angle, translate, scale, shear):
    # Helper method to compute matrix for affine transformation
    # We need compute affine transformation matrix: M = T * C * RSS * C^-1
    # where T is translation matrix: [1, 0, tx | 0, 1, ty | 0, 0, 1]
    #       C is translation matrix to keep center: [1, 0, cx | 0, 1, cy | 0, 0, 1]
    #       RSS is rotation with scale and shear matrix
    #       RSS(a, scale, shear) = [ cos(a)*scale    -sin(a + shear)*scale     0]
    #                              [ sin(a)*scale    cos(a + shear)*scale     0]
    #                              [     0                  0          1]

    angle = math.radians(angle)
    shear = math.radians(shear)
    # scale = 1.0 / scale

    T = np.array([[1, 0, translate[0]], [0, 1, translate[1]], [0, 0, 1]])
    C = np.array([[1, 0, center[0]], [0, 1, center[1]], [0, 0, 1]])
    RSS = np.array(
        [
            [math.cos(angle) * scale, -math.sin(angle + shear) * scale, 0],
            [math.sin(angle) * scale, math.cos(angle + shear) * scale, 0],
            [0, 0, 1],
        ]
    )
    matrix = T @ C @ RSS @ np.linalg.inv(C)

    return matrix[:2, :]


def affine(
    img,
    angle,
    translate,
    scale,
    shear,
    interpolation=cv2.INTER_LINEAR,
    mode=cv2.BORDER_CONSTANT,
    fillcolor=0,
):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy Image. Got {}".format(type(img)))

    assert (
        isinstance(translate, (tuple, list)) and len(translate) == 2
    ), "Argument translate should be a list or tuple of length 2"

    assert scale > 0.0, "Argument scale should be positive"

    output_size = img.shape[0:2]
    center = (img.shape[1] * 0.5 + 0.5, img.shape[0] * 0.5 + 0.5)
    matrix = _get_affine_matrix(center, angle, translate, scale, shear)

    if img.shape[2] == 1:
        return cv2.warpAffine(
            img,
            matrix,
            output_size[::-1],
            interpolation,
            borderMode=mode,
            borderValue=fillcolor,
        )[:, :, np.newaxis]
    else:
        return cv2.warpAffine(
            img,
            matrix,
            output_size[::-1],
            interpolation,
            borderMode=mode,
            borderValue=fillcolor,
        )


def to_grayscale(img, num_output_channels=1):
    if not _is_numpy_image(img):
        raise TypeError("img should be numpy ndarray. Got {}".format(type(img)))

    if num_output_channels == 1:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)[:, :, np.newaxis]
    elif num_output_channels == 3:
        # much faster than doing cvtColor to go back to gray
        img = np.broadcast_to(
            cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)[:, :, np.newaxis], img.shape
        )
    return img
