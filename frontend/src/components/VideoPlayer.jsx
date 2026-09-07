const VideoPlayer = ({ stream, muted = false }) => {
    return (
        <video
            ref={(video) => {
                if (video && stream) {
                    video.srcObject = stream;
                }
            }}
            autoPlay
            playsInline
            muted={muted}
            style={{
                width: "400px",
                height: "300px",
                backgroundColor: "black",
                objectFit: "cover",
            }}
        />
    );
};

export default VideoPlayer;