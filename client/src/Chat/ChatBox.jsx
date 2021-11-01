import React, {useState, useEffect, useRef} from "react";
import {makeStyles} from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import SendIcon from "@material-ui/icons/Send";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import Paper from "@material-ui/core/Paper";
import socketIOClient from "socket.io-client";
import classnames from "classnames";
import commonUtilites from "../Utilities/common";
import moment from "moment"

import {
    useGetGlobalMessages,
    useSendGlobalMessage,
    useGetConversationMessages,
    useSendConversationMessage,
    useGetGlobalMessagesByCursor,
    useGetGlobalMessagesByPagination,
    useGetGlobalMessagesByDate,
    useGetGlobalMessagesBylast_data

} from "../Services/chatService";
import {authenticationService} from "../Services/authenticationService";

const useStyles = makeStyles((theme) => ({
    root: {
        height: "100%",

    },
    headerRow: {
        maxHeight: 60,
        zIndex: 5,
    },
    forwhiteText: {
        color: "white",

    },
    positionDate: {
        display: "flex",
        justifyContent: "flex-end",
        right: '0',
        color: "white",
        opacity: ".7"
    },
    paper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: theme.palette.primary.dark,
    },
    avatarTag: {
        boxShadow: 'rgb(104, 50, 138) 0px 30px 60px -12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset',
    },
    messageContainer: {
        height: "100%",
        display: "flex",
        alignContent: "flex-end",

    },
    messagesRow: {
        maxHeight: "calc(100vh - 184px)",
        overflowY: "auto",

    },
    newMessageRow: {
        width: "100%",
        backgroundColor: "white",
        paddingTop: "10px",
        paddingBottom: "10px",

        background: "linear-gradient(to right, #c9d6ff, #e2e2e2)",
        paddingLeft: "10px"
    },
    messageBubble: {
        padding: 10,
        backgroundColor: "white",
        //boxShadow: 'rgba(255, 255, 255, 0.5) 0px 3px 8px',
        borderRadius: "0 10px 10px 10px",
        marginTop: 8,
        maxWidth: "40em",
        paddingRight: "20px"
    },
    messageBubbleRight: {
        borderRadius: "10px 0 10px 10px",
    },
    inputRow: {
        display: "flex",
        alignItems: "flex-end",
    },

    form: {
        width: "100%",
    },
    avatar: {
        margin: theme.spacing(1, 1.5),
    },
    listItem: {
        display: "flex",
        width: "100%",

    },
    /* listItem  > div: {

     },*/
    listItemRight: {
        flexDirection: "row-reverse",
    },
    bg: {
        background: "linear-gradient(to right, #0f2027, #203a43, #2c5364)"
    }
}));

const ChatBox = (props) => {
    const [currentUserId] = useState(
        authenticationService.currentUserValue.userId
    );
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [lastMessage, setLastMessage] = useState(null);
    const [timestamp, setDate] = useState(null);
    const [bottom,setBottom] = useState(null)
    const [scrollTopBottom, setScrollTopBottom] = useState(false)

    const getGlobalMessages = useGetGlobalMessages();
    const sendGlobalMessage = useSendGlobalMessage();
    const getConversationMessages = useGetConversationMessages();
    const sendConversationMessage = useSendConversationMessage();
   // const getGlobalMessagesByCursor = useGetGlobalMessagesByCursor();
    const pagination = useGetGlobalMessagesByPagination();
    const date = useGetGlobalMessagesByDate()
    const last_data = useGetGlobalMessagesBylast_data()

    let chatTop = useRef(null);
    let chatBox = useRef(null);
    const classes = useStyles();

    function handleScroll(event) {
        var node = event.target;
        var top = node.scrollTop === 0;
        var element = event.target;

        if (element.scrollHeight - element.scrollTop - element.clientHeight<=0)
        {
            date(timestamp).then((res)=>{
                var tempdate = res.last;
                setDate(tempdate)

                console.log(timestamp)
            })
            last_data(timestamp).then((res) => {
                setMessages(res);
            });
        }
        if (top) {
             date(timestamp).then((res)=>{
                 var tempdate = res.time;
                 console.log(tempdate)
                 setDate(tempdate)

                 console.log(timestamp)
             })
            pagination(timestamp).then((res) => {
                setMessages(res);
             //   console.log(res);
            });
        }

    }

    useEffect(() => {
        if (scrollTopBottom) {
            scrollToTop();
        } else {

            // scrollToBottom();
        }
        reloadMessages();
    }, [lastMessage, props.scope, props.conversationId, newMessage]);

    useEffect(() => {
        const socket = socketIOClient("http://localhost:5000", {
            withCredentials: true,
            transportOptions: {
                polling: {
                    extraHeaders: {
                        "my-custom-header": "abcd"
                    }
                }
            }
        });
        socket.on("messages", (data) => {
            setLastMessage(data)
        });

    }, []);

    const reloadMessages = () => {
        if (props.scope === "Global Chat") {
            getGlobalMessages().then((res) => {
                setMessages(res);
            });
        } else if (props.scope !== null && props.conversationId !== null) {
            getConversationMessages(props.user._id).then((res) => setMessages(res));
        } else {
            setMessages([]);
        }
    };
    const scrollToBottom = () => {
       // chatBottom.current.scrollIntoView({ /*behavior:"smooth"*/});
    };
    const scrollToTop = () => {
        chatTop.current.scrollIntoView({/*block: "start"*/});
    };


    useEffect(() => {
        scrollToBottom()
        reloadMessages();
    }, [lastMessage, props.scope, props.conversationId, newMessage]);
    useEffect(scrollToBottom, [messages, newMessage]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (props.scope === "Global Chat") {
            sendGlobalMessage(newMessage).then(() => {
                setNewMessage("");
            });
        } else {
            sendConversationMessage(props.user._id, newMessage).then((res) => {
                setNewMessage("");
            });
        }
    };

    const changeVle = (e) => {
        setNewMessage(e.target.value)
    }

    const conversion = (timeStamp) => {
        var Date_Time = moment(timeStamp).format("DD-MM-YYYY hh:mm A")
        return Date_Time;
    }

    /*function handleScrollCount(e) {
        let lastScrollY = e.target.scrollTop;
        if(lastScrollY === 0) {
            setScrollTopBottom(true);
        } else {
            setScrollTopBottom(false);
        }
    }*/


    /*useEffect(() => {
        window.scrollTo(0, 0)


     }, [chatTop])*/
    /*      useEffect(() => {
              window.addEventListener('scroll', handleScrollCount);
              console.log(scrollTopBottom);
          },[scrollTopBottom])*/
    return (
        <Grid container className={classes.root}>
            <Grid item xs={12} className={classes.headerRow}>
                <Paper className={classes.paper} square elevation={2}>
                    <Typography color="inherit" variant="h6">
                        {props.scope}
                    </Typography>
                </Paper>
            </Grid>

            {/* messages*/}


            <Grid ref={chatBox} item xs={12} onScroll={(e) => {
               handleScroll(e);
                // handleScrollCount(e);
            }} className={classes.bg}>
                <Grid container className={classes.messageContainer}>
                    <Grid item xs={12} className={classes.messagesRow}>
                        <div ref={chatTop}/>
                        {messages && (
                            <List>
                                {messages.map((m) => (

                                    <ListItem
                                        key={m._id}
                                        className={classnames(classes.listItem, {
                                            [`${classes.listItemRight}`]:
                                            m.fromObj[0]._id === currentUserId,
                                        })}
                                        alignItems="flex-start"
                                    >
                                        <ListItemAvatar className={classes.avatar}>
                                            <Avatar className={classes.avatarTag}>
                                                {commonUtilites.getInitialsFromName(m.fromObj[0].name)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText style={{background: "rgba(255 ,255, 255,.2 )",}}
                                                      classes={{
                                                          root: classnames(classes.messageBubble, {
                                                              [`${classes.messageBubbleRight}`]:
                                                              m.fromObj[0]._id === currentUserId,
                                                          }),
                                                      }}
                                                      primary={
                                                          <React.Fragment>
                                                              <div style={{color: "wheat"}}>
                                                                  {m.fromObj[0] && m.fromObj[0].name}
                                                              </div>
                                                          </React.Fragment>
                                                      }
                                                      secondary={<React.Fragment>
                                                          <div style={{
                                                              color: "white"
                                                          }}>{m.body}</div>
                                                          <span className={classes.positionDate}>
                              {conversion(Number(m.date))}
                          </span>
                                                      </React.Fragment>}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                       {/* <div ref={chatBottom}/>*/}
                    </Grid>

                    <Grid item xs={12} className={classes.inputRow}>
                        <form autocomplete="off" onSubmit={handleSubmit} className={classes.form}>
                            <Grid
                                container
                                className={classes.newMessageRow}
                                alignItems="flex-end"
                            >
                                <Grid item xs={11}>
                                    <TextField className={classes.forwhiteText}
                                               id="message"
                                               label="Message"
                                               variant="outlined"
                                               margin="dense"
                                               fullWidth
                                               value={newMessage}
                                               onChange={(e) => {
                                                   changeVle(e)
                                               }}
                                    />
                                </Grid>
                                <Grid item xs={1}>
                                    <IconButton type="submit">
                                        <SendIcon/>
                                    </IconButton>
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default ChatBox;
