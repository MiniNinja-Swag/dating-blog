import React from 'react';
import { View, Text } from 'react-native';
import ImageViewingNative from 'react-native-image-viewing';

interface ImageViewerProps {
    images: Array<{ uri: string }>;
    imageIndex: number;
    visible: boolean;
    onRequestClose: () => void;
    doubleTapToZoomEnabled?: boolean;
    swipeToCloseEnabled?: boolean;
    FooterComponent?: React.ComponentType<{ imageIndex: number }>;
}

export default function ImageViewer({
    images,
    imageIndex,
    visible,
    onRequestClose,
    doubleTapToZoomEnabled = true,
    swipeToCloseEnabled = true,
    FooterComponent,
}: ImageViewerProps) {
    return (
        <ImageViewingNative
            images={images}
            imageIndex={imageIndex}
            visible={visible}
            onRequestClose={onRequestClose}
            doubleTapToZoomEnabled={doubleTapToZoomEnabled}
            swipeToCloseEnabled={swipeToCloseEnabled}
            FooterComponent={FooterComponent}
        />
    );
}
